-- M11.3A - Canonical Plan graph foundation.
--
-- Additive only: legacy planner_goals/planner_goal_milestones remain intact.
-- This migration owns Plan-internal state only. It creates no Task/Event FK and
-- performs no Task/Event controller effect.

begin;

-- --------------------------------------------------------------------------
-- Canonical graph tables
-- --------------------------------------------------------------------------

create table public.planner_plans (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  owner_person_id uuid null references public.people(id) on delete restrict,
  household_id uuid null references public.households(id) on delete restrict,
  objective text not null,
  description text null,
  lifecycle text not null default 'draft',
  target_date date null,
  finalization_kind text not null default 'none',
  created_by_person_id uuid not null references public.people(id) on delete restrict,
  created_by_member_id uuid null references public.household_members(id) on delete set null,
  activated_at timestamptz null,
  paused_at timestamptz null,
  completed_at timestamptz null,
  closed_at timestamptz null,
  closed_reason text null,
  archived_at timestamptz null,
  trashed_at timestamptz null,
  trashed_by_person_id uuid null references public.people(id) on delete set null,
  trashed_by_member_id uuid null references public.household_members(id) on delete set null,
  trash_operation_id text null,
  restore_review_required boolean not null default false,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planner_plans_scope_check check (scope in ('personal', 'household')),
  constraint planner_plans_lifecycle_check check (lifecycle in ('draft', 'active', 'paused', 'completed', 'closed')),
  constraint planner_plans_finalization_kind_check check (finalization_kind in ('none', 'date', 'event')),
  constraint planner_plans_objective_not_blank check (length(btrim(objective)) > 0),
  constraint planner_plans_version_positive check (version >= 1),
  constraint planner_plans_owner_shape check (
    (scope = 'personal' and owner_person_id is not null and household_id is null and created_by_member_id is null)
    or
    (scope = 'household' and owner_person_id is null and household_id is not null and created_by_member_id is not null)
  ),
  constraint planner_plans_archive_terminal_only check (
    archived_at is null or lifecycle in ('completed', 'closed')
  ),
  constraint planner_plans_trash_actor_shape check (
    (trashed_at is null and trashed_by_person_id is null and trashed_by_member_id is null and trash_operation_id is null)
    or
    (trashed_at is not null and trashed_by_person_id is not null and trash_operation_id is not null)
  )
);

create table public.planner_plan_milestones (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.planner_plans(id) on delete restrict,
  title text not null,
  description text null,
  completion_mode text not null default 'manual',
  lifecycle text not null default 'pending',
  classification text not null default 'necessary',
  completed_at timestamptz null,
  completed_by_person_id uuid null references public.people(id) on delete set null,
  completed_by_member_id uuid null references public.household_members(id) on delete set null,
  sort_order integer not null default 0,
  trashed_at timestamptz null,
  trashed_by_person_id uuid null references public.people(id) on delete set null,
  trashed_by_member_id uuid null references public.household_members(id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planner_plan_milestones_title_not_blank check (length(btrim(title)) > 0),
  constraint planner_plan_milestones_completion_mode_check check (completion_mode in ('automatic', 'manual')),
  constraint planner_plan_milestones_lifecycle_check check (lifecycle in ('pending', 'completed')),
  constraint planner_plan_milestones_classification_check check (classification in ('necessary', 'supporting')),
  constraint planner_plan_milestones_sort_order_check check (sort_order >= 0),
  constraint planner_plan_milestones_version_positive check (version >= 1),
  constraint planner_plan_milestones_completion_shape check (
    (lifecycle = 'pending' and completed_at is null and completed_by_person_id is null and completed_by_member_id is null)
    or
    (lifecycle = 'completed' and completed_at is not null)
  ),
  constraint planner_plan_milestones_trash_actor_shape check (
    (trashed_at is null and trashed_by_person_id is null and trashed_by_member_id is null)
    or (trashed_at is not null and trashed_by_person_id is not null)
  )
);

create table public.planner_plan_measurements (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.planner_plans(id) on delete restrict,
  name text not null,
  current_value numeric not null default 0,
  target_value numeric null,
  unit text not null,
  target_operator text not null default 'gte',
  classification text not null default 'necessary',
  sort_order integer not null default 0,
  trashed_at timestamptz null,
  trashed_by_person_id uuid null references public.people(id) on delete set null,
  trashed_by_member_id uuid null references public.household_members(id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planner_plan_measurements_name_not_blank check (length(btrim(name)) > 0),
  constraint planner_plan_measurements_unit_not_blank check (length(btrim(unit)) > 0),
  constraint planner_plan_measurements_operator_check check (target_operator in ('gte', 'lte', 'eq')),
  constraint planner_plan_measurements_classification_check check (classification in ('necessary', 'supporting')),
  constraint planner_plan_measurements_sort_order_check check (sort_order >= 0),
  constraint planner_plan_measurements_version_positive check (version >= 1),
  constraint planner_plan_measurements_trash_actor_shape check (
    (trashed_at is null and trashed_by_person_id is null and trashed_by_member_id is null)
    or (trashed_at is not null and trashed_by_person_id is not null)
  )
);

create table public.planner_plan_measurement_history (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.planner_plans(id) on delete restrict,
  measurement_id uuid not null references public.planner_plan_measurements(id) on delete restrict,
  value numeric not null,
  previous_value numeric null,
  recorded_by_person_id uuid not null references public.people(id) on delete restrict,
  recorded_by_member_id uuid null references public.household_members(id) on delete set null,
  correction_of_id uuid null,
  operation_id text not null,
  recorded_at timestamptz not null default now(),
  constraint planner_plan_measurement_history_operation_not_blank check (length(btrim(operation_id)) > 0),
  unique (measurement_id, operation_id),
  unique (id, measurement_id, plan_id),
  constraint planner_plan_measurement_history_correction_same_measurement_fkey
    foreign key (correction_of_id, measurement_id, plan_id)
    references public.planner_plan_measurement_history(id, measurement_id, plan_id)
    on delete restrict
);

create table public.planner_plan_manual_conditions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.planner_plans(id) on delete restrict,
  label text not null,
  is_satisfied boolean not null default false,
  classification text not null default 'necessary',
  satisfied_at timestamptz null,
  satisfied_by_person_id uuid null references public.people(id) on delete set null,
  satisfied_by_member_id uuid null references public.household_members(id) on delete set null,
  sort_order integer not null default 0,
  trashed_at timestamptz null,
  trashed_by_person_id uuid null references public.people(id) on delete set null,
  trashed_by_member_id uuid null references public.household_members(id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planner_plan_manual_conditions_label_not_blank check (length(btrim(label)) > 0),
  constraint planner_plan_manual_conditions_classification_check check (classification in ('necessary', 'supporting')),
  constraint planner_plan_manual_conditions_sort_order_check check (sort_order >= 0),
  constraint planner_plan_manual_conditions_version_positive check (version >= 1),
  constraint planner_plan_manual_conditions_satisfied_shape check (
    (not is_satisfied and satisfied_at is null and satisfied_by_person_id is null and satisfied_by_member_id is null)
    or (is_satisfied and satisfied_at is not null and satisfied_by_person_id is not null)
  ),
  constraint planner_plan_manual_conditions_trash_actor_shape check (
    (trashed_at is null and trashed_by_person_id is null and trashed_by_member_id is null)
    or (trashed_at is not null and trashed_by_person_id is not null)
  )
);

create table public.planner_plan_requirements (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.planner_plans(id) on delete restrict,
  parent_requirement_id uuid null references public.planner_plan_requirements(id) on delete restrict,
  subject_type text not null,
  milestone_id uuid null references public.planner_plan_milestones(id) on delete restrict,
  measurement_id uuid null references public.planner_plan_measurements(id) on delete restrict,
  manual_condition_id uuid null references public.planner_plan_manual_conditions(id) on delete restrict,
  external_kind text null,
  external_reference_key uuid null,
  external_entity_id uuid null,
  classification text not null,
  sort_order integer not null default 0,
  trashed_at timestamptz null,
  trashed_by_person_id uuid null references public.people(id) on delete set null,
  trashed_by_member_id uuid null references public.household_members(id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planner_plan_requirements_subject_type_check check (
    subject_type in ('milestone', 'measurement', 'manual_condition', 'external')
  ),
  constraint planner_plan_requirements_external_kind_check check (
    external_kind is null or external_kind in ('task', 'event')
  ),
  constraint planner_plan_requirements_classification_check check (classification in ('necessary', 'supporting')),
  constraint planner_plan_requirements_sort_order_check check (sort_order >= 0),
  constraint planner_plan_requirements_version_positive check (version >= 1),
  constraint planner_plan_requirements_not_self_parent check (parent_requirement_id is null or parent_requirement_id <> id),
  constraint planner_plan_requirements_subject_shape check (
    (subject_type = 'milestone' and milestone_id is not null and measurement_id is null and manual_condition_id is null and external_kind is null and external_reference_key is null and external_entity_id is null)
    or
    (subject_type = 'measurement' and milestone_id is null and measurement_id is not null and manual_condition_id is null and external_kind is null and external_reference_key is null and external_entity_id is null)
    or
    (subject_type = 'manual_condition' and milestone_id is null and measurement_id is null and manual_condition_id is not null and external_kind is null and external_reference_key is null and external_entity_id is null)
    or
    -- External requirements are typed but deliberately unbound in M11.3A.
    -- Integration owns the future FK/binding migration.
    (subject_type = 'external' and milestone_id is null and measurement_id is null and manual_condition_id is null and external_kind is not null and external_reference_key is not null and external_entity_id is null)
  ),
  constraint planner_plan_requirements_trash_actor_shape check (
    (trashed_at is null and trashed_by_person_id is null and trashed_by_member_id is null)
    or (trashed_at is not null and trashed_by_person_id is not null)
  )
);

create table public.planner_plan_operations (
  id uuid primary key default gen_random_uuid(),
  actor_person_id uuid not null references public.people(id) on delete restrict,
  actor_member_id uuid null references public.household_members(id) on delete set null,
  household_id uuid null references public.households(id) on delete restrict,
  mutation_id text not null,
  idempotency_key text not null,
  request_hash text not null,
  operation text not null,
  aggregate_type text not null,
  aggregate_id uuid null,
  previous_version integer null,
  result_version integer null,
  before_state jsonb null,
  result_state jsonb null,
  outcome text null,
  response_body jsonb null,
  created_at timestamptz not null default now(),
  completed_at timestamptz null,
  constraint planner_plan_operations_mutation_id_check check (mutation_id ~ '^[A-Za-z0-9._:-]{1,128}$'),
  constraint planner_plan_operations_idempotency_key_check check (idempotency_key ~ '^[A-Za-z0-9._:-]{1,128}$'),
  constraint planner_plan_operations_hash_check check (request_hash ~ '^[a-f0-9]{64}$'),
  constraint planner_plan_operations_operation_not_blank check (length(btrim(operation)) > 0),
  constraint planner_plan_operations_aggregate_type_check check (
    aggregate_type in ('plan', 'milestone', 'measurement', 'manual_condition', 'requirement')
  ),
  constraint planner_plan_operations_outcome_check check (
    outcome is null or outcome in ('created', 'updated', 'noop')
  ),
  unique (actor_person_id, idempotency_key)
);

create table public.planner_plan_legacy_goal_links (
  legacy_goal_id uuid primary key references public.planner_goals(id) on delete restrict,
  plan_id uuid not null unique references public.planner_plans(id) on delete restrict,
  mapping_kind text not null default 'reviewed_manual',
  mapped_by_person_id uuid not null references public.people(id) on delete restrict,
  mapped_at timestamptz not null default now(),
  constraint planner_plan_legacy_goal_links_kind_check check (mapping_kind = 'reviewed_manual')
);

-- --------------------------------------------------------------------------
-- Indexes, timestamps and versions
-- --------------------------------------------------------------------------

create index planner_plans_person_idx on public.planner_plans (owner_person_id, lifecycle, updated_at desc)
  where scope = 'personal' and trashed_at is null;
create index planner_plans_household_idx on public.planner_plans (household_id, lifecycle, updated_at desc)
  where scope = 'household' and trashed_at is null;
create index planner_plan_milestones_plan_order_idx on public.planner_plan_milestones (plan_id, sort_order, id);
create index planner_plan_measurements_plan_order_idx on public.planner_plan_measurements (plan_id, sort_order, id);
create index planner_plan_manual_conditions_plan_order_idx on public.planner_plan_manual_conditions (plan_id, sort_order, id);
create index planner_plan_requirements_tree_idx on public.planner_plan_requirements (plan_id, parent_requirement_id, sort_order, id);
create index planner_plan_measurement_history_idx on public.planner_plan_measurement_history (measurement_id, recorded_at desc, id);

create unique index planner_plan_requirements_one_milestone_idx
  on public.planner_plan_requirements (plan_id, milestone_id) where milestone_id is not null and trashed_at is null;
create unique index planner_plan_requirements_one_measurement_idx
  on public.planner_plan_requirements (plan_id, measurement_id) where measurement_id is not null and trashed_at is null;
create unique index planner_plan_requirements_one_condition_idx
  on public.planner_plan_requirements (plan_id, manual_condition_id) where manual_condition_id is not null and trashed_at is null;
create unique index planner_plan_requirements_one_external_reference_idx
  on public.planner_plan_requirements (plan_id, external_kind, external_reference_key)
  where subject_type = 'external' and trashed_at is null;

alter table public.planner_plan_measurements
  add constraint planner_plan_measurements_id_plan_unique unique (id, plan_id);
alter table public.planner_plan_measurement_history
  add constraint planner_plan_measurement_history_same_plan_fkey
  foreign key (measurement_id, plan_id)
  references public.planner_plan_measurements(id, plan_id) on delete restrict;

create or replace function public.planner_plan_touch_version()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  new.version := old.version + 1;
  return new;
end;
$$;

create trigger planner_plans_touch_version before update on public.planner_plans
for each row execute function public.planner_plan_touch_version();
create trigger planner_plan_milestones_touch_version before update on public.planner_plan_milestones
for each row execute function public.planner_plan_touch_version();
create trigger planner_plan_measurements_touch_version before update on public.planner_plan_measurements
for each row execute function public.planner_plan_touch_version();
create trigger planner_plan_manual_conditions_touch_version before update on public.planner_plan_manual_conditions
for each row execute function public.planner_plan_touch_version();
create trigger planner_plan_requirements_touch_version before update on public.planner_plan_requirements
for each row execute function public.planner_plan_touch_version();

-- --------------------------------------------------------------------------
-- Actor, capability and graph-integrity helpers
-- --------------------------------------------------------------------------

create or replace function public.planner_plan_actor_has_capability(
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
  select hm.role, h.config into v_role, v_config
  from public.household_members hm
  join public.households h on h.id = hm.household_id
  where hm.household_id = p_household_id
    and hm.person_id = public.current_person_id()
    and hm.status = 'active'
  limit 1;

  if v_role is null then return false; end if;
  v_configured := v_config -> 'permissions' -> p_capability -> v_role;
  if jsonb_typeof(v_configured) = 'boolean' then
    return (v_configured #>> '{}')::boolean;
  end if;

  return case p_capability
    when 'planner.view' then v_role in ('coordinator','adult','adolescent','child','senior','guest')
    when 'goal.create_household' then v_role in ('coordinator','adult','adolescent','senior')
    when 'goal.edit_own' then v_role in ('coordinator','adult','adolescent','child','senior','guest')
    when 'goal.edit_any' then v_role in ('coordinator','adult','senior')
    when 'goal.complete_own' then v_role in ('coordinator','adult','adolescent','child','senior','guest')
    when 'goal.complete_any' then v_role in ('coordinator','adult','senior')
    when 'goal.close_own' then v_role in ('coordinator','adult','adolescent','child','senior','guest')
    when 'goal.close_any' then v_role in ('coordinator','adult','senior')
    when 'goal.archive' then false
    when 'goal.restore' then v_role in ('coordinator','adult','adolescent','child','senior')
    else false
  end;
end;
$$;

create or replace function public.planner_plan_can_read(p_plan_id uuid, p_include_trash boolean default false)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.planner_plans p
    where p.id = p_plan_id
      and (p_include_trash or p.trashed_at is null)
      and (
        (p.scope = 'personal' and p.owner_person_id = public.current_person_id())
        or
        (p.scope = 'household'
          and public.current_household_member_id(p.household_id) is not null
          and public.planner_plan_actor_has_capability(p.household_id, 'planner.view')
          and (p.lifecycle <> 'draft' or p.created_by_person_id = public.current_person_id()))
      )
  )
$$;

create or replace function public.planner_plan_can_mutate(p_plan_id uuid, p_action text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_plan public.planner_plans%rowtype;
  v_actor_member_id uuid;
  v_capability text;
begin
  select * into v_plan from public.planner_plans where id = p_plan_id;
  if not found then return false; end if;
  if v_plan.scope = 'personal' then
    return v_plan.owner_person_id = public.current_person_id();
  end if;
  v_actor_member_id := public.current_household_member_id(v_plan.household_id);
  if v_actor_member_id is null
    or not public.planner_plan_actor_has_capability(v_plan.household_id, 'planner.view') then
    return false;
  end if;
  -- Household Drafts are creator-private until explicit activation. M11.3A
  -- intentionally has no Draft collaboration contract.
  if v_plan.lifecycle = 'draft' and v_plan.created_by_person_id <> public.current_person_id() then
    return false;
  end if;
  if p_action in ('archive','unarchive') then v_capability := 'goal.archive';
  elsif p_action in ('trash','restore') then v_capability := 'goal.restore';
  elsif p_action in ('complete') then
    v_capability := case when v_plan.created_by_member_id = v_actor_member_id then 'goal.complete_own' else 'goal.complete_any' end;
  elsif p_action in ('close','reopen') then
    v_capability := case when v_plan.created_by_member_id = v_actor_member_id then 'goal.close_own' else 'goal.close_any' end;
  else
    v_capability := case when v_plan.created_by_member_id = v_actor_member_id then 'goal.edit_own' else 'goal.edit_any' end;
  end if;
  return public.planner_plan_actor_has_capability(v_plan.household_id, v_capability);
end;
$$;

create or replace function public.planner_plan_authorization_context_rpc(p_plan_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case when public.planner_plan_can_read(p.id, true) then jsonb_build_object(
    'id',p.id,'scope',p.scope,'owner_person_id',p.owner_person_id,
    'household_id',p.household_id,'created_by_member_id',p.created_by_member_id,
    'lifecycle',p.lifecycle,'trashed_at',p.trashed_at,'version',p.version
  ) else null end
  from public.planner_plans p where p.id=p_plan_id
$$;

create or replace function public.planner_plan_validate_requirement()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_subject_plan_id uuid;
  v_subject_classification text;
  v_cursor uuid;
  v_cursor_plan_id uuid;
begin
  if new.subject_type = 'milestone' then
    select plan_id, classification into v_subject_plan_id, v_subject_classification
    from public.planner_plan_milestones where id = new.milestone_id;
  elsif new.subject_type = 'measurement' then
    select plan_id, classification into v_subject_plan_id, v_subject_classification
    from public.planner_plan_measurements where id = new.measurement_id;
  elsif new.subject_type = 'manual_condition' then
    select plan_id, classification into v_subject_plan_id, v_subject_classification
    from public.planner_plan_manual_conditions where id = new.manual_condition_id;
  else
    v_subject_plan_id := new.plan_id;
    v_subject_classification := new.classification;
  end if;

  if v_subject_plan_id is null or v_subject_plan_id <> new.plan_id then
    raise exception 'requirement subject must belong to the same Plan' using errcode = '23514';
  end if;
  if v_subject_classification <> new.classification then
    raise exception 'requirement classification must match its subject' using errcode = '23514';
  end if;

  v_cursor := new.parent_requirement_id;
  while v_cursor is not null loop
    if v_cursor = new.id then
      raise exception 'requirement hierarchy cannot contain a cycle' using errcode = '23514';
    end if;
    select plan_id, parent_requirement_id into v_cursor_plan_id, v_cursor
    from public.planner_plan_requirements where id = v_cursor;
    if not found or v_cursor_plan_id <> new.plan_id then
      raise exception 'parent requirement must belong to the same Plan' using errcode = '23514';
    end if;
  end loop;
  return new;
end;
$$;

create constraint trigger planner_plan_requirements_validate_graph
after insert or update on public.planner_plan_requirements
deferrable initially immediate
for each row execute function public.planner_plan_validate_requirement();

create or replace function public.planner_plan_requirement_satisfied_internal(
  p_requirement_id uuid,
  p_path uuid[]
)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_requirement public.planner_plan_requirements%rowtype;
  v_subject_satisfied boolean := false;
  v_child record;
begin
  if p_requirement_id = any(coalesce(p_path, '{}'::uuid[]))
    or coalesce(array_length(p_path, 1), 0) >= 256 then
    return false;
  end if;

  select * into v_requirement
  from public.planner_plan_requirements
  where id = p_requirement_id and trashed_at is null;
  if not found then return false; end if;

  if v_requirement.subject_type = 'milestone' then
    select coalesce(m.lifecycle = 'completed' and m.trashed_at is null, false)
    into v_subject_satisfied
    from public.planner_plan_milestones m where m.id = v_requirement.milestone_id;
  elsif v_requirement.subject_type = 'measurement' then
    select coalesce(
      x.trashed_at is null and x.target_value is not null and
      case x.target_operator
        when 'gte' then x.current_value >= x.target_value
        when 'lte' then x.current_value <= x.target_value
        when 'eq' then x.current_value = x.target_value
      end, false)
    into v_subject_satisfied
    from public.planner_plan_measurements x where x.id = v_requirement.measurement_id;
  elsif v_requirement.subject_type = 'manual_condition' then
    select coalesce(c.is_satisfied and c.trashed_at is null, false)
    into v_subject_satisfied
    from public.planner_plan_manual_conditions c where c.id = v_requirement.manual_condition_id;
  else
    -- External Task/Event requirements remain unbound and unsatisfied in M11.3A.
    v_subject_satisfied := false;
  end if;

  if not coalesce(v_subject_satisfied, false) then return false; end if;

  for v_child in
    select id from public.planner_plan_requirements
    where parent_requirement_id = v_requirement.id
      and plan_id = v_requirement.plan_id
      and classification = 'necessary'
      and trashed_at is null
  loop
    if not public.planner_plan_requirement_satisfied_internal(
      v_child.id,
      array_append(coalesce(p_path, '{}'::uuid[]), v_requirement.id)
    ) then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

create or replace function public.planner_plan_requirement_satisfied(p_requirement_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_plan_id uuid;
begin
  select plan_id into v_plan_id
  from public.planner_plan_requirements
  where id = p_requirement_id;

  if v_plan_id is null or not public.planner_plan_can_read(v_plan_id, true) then
    return false;
  end if;

  return public.planner_plan_requirement_satisfied_internal(
    p_requirement_id,
    '{}'::uuid[]
  );
end;
$$;

create or replace function public.planner_plan_recompute_automatic_milestones(p_plan_id uuid)
returns void
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_changed integer;
  v_iteration integer := 0;
begin
  loop
    v_iteration := v_iteration + 1;
    with desired as (
      select m.id,
        case when exists (
          select 1 from public.planner_plan_requirements own_r
          join public.planner_plan_requirements child_r on child_r.parent_requirement_id = own_r.id
          where own_r.milestone_id = m.id and own_r.trashed_at is null
            and child_r.trashed_at is null and child_r.classification = 'necessary'
        ) and not exists (
          select 1 from public.planner_plan_requirements own_r
          join public.planner_plan_requirements child_r on child_r.parent_requirement_id = own_r.id
          where own_r.milestone_id = m.id and own_r.trashed_at is null
            and child_r.trashed_at is null and child_r.classification = 'necessary'
            and not public.planner_plan_requirement_satisfied(child_r.id)
        ) then 'completed' else 'pending' end as lifecycle
      from public.planner_plan_milestones m
      where m.plan_id = p_plan_id and m.completion_mode = 'automatic' and m.trashed_at is null
    )
    update public.planner_plan_milestones m
    set lifecycle = d.lifecycle,
        completed_at = case when d.lifecycle = 'completed' then coalesce(m.completed_at, now()) else null end,
        completed_by_person_id = null,
        completed_by_member_id = null
    from desired d
    where m.id = d.id and m.lifecycle is distinct from d.lifecycle;
    get diagnostics v_changed = row_count;
    exit when v_changed = 0 or v_iteration >= 64;
  end loop;
end;
$$;

-- --------------------------------------------------------------------------
-- RLS: personal data is owner-only; household data requires active membership
-- and the existing Goal capability names. Canonical writes are RPC-only.
-- --------------------------------------------------------------------------

alter table public.planner_plans enable row level security;
alter table public.planner_plan_milestones enable row level security;
alter table public.planner_plan_measurements enable row level security;
alter table public.planner_plan_measurement_history enable row level security;
alter table public.planner_plan_manual_conditions enable row level security;
alter table public.planner_plan_requirements enable row level security;
alter table public.planner_plan_operations enable row level security;
alter table public.planner_plan_legacy_goal_links enable row level security;

create policy planner_plans_select on public.planner_plans for select to authenticated
using (public.planner_plan_can_read(id, false));
create policy planner_plan_milestones_select on public.planner_plan_milestones for select to authenticated
using (trashed_at is null and public.planner_plan_can_read(plan_id, false));
create policy planner_plan_measurements_select on public.planner_plan_measurements for select to authenticated
using (trashed_at is null and public.planner_plan_can_read(plan_id, false));
create policy planner_plan_measurement_history_select on public.planner_plan_measurement_history for select to authenticated
using (public.planner_plan_can_read(plan_id, false));
create policy planner_plan_manual_conditions_select on public.planner_plan_manual_conditions for select to authenticated
using (trashed_at is null and public.planner_plan_can_read(plan_id, false));
create policy planner_plan_requirements_select on public.planner_plan_requirements for select to authenticated
using (trashed_at is null and public.planner_plan_can_read(plan_id, false));
create policy planner_plan_operations_select on public.planner_plan_operations for select to authenticated
using (actor_person_id = public.current_person_id());
create policy planner_plan_legacy_goal_links_select on public.planner_plan_legacy_goal_links for select to authenticated
using (public.planner_plan_can_read(plan_id, true));

revoke all on public.planner_plans from public, anon, authenticated;
revoke all on public.planner_plan_milestones from public, anon, authenticated;
revoke all on public.planner_plan_measurements from public, anon, authenticated;
revoke all on public.planner_plan_measurement_history from public, anon, authenticated;
revoke all on public.planner_plan_manual_conditions from public, anon, authenticated;
revoke all on public.planner_plan_requirements from public, anon, authenticated;
revoke all on public.planner_plan_operations from public, anon, authenticated;
revoke all on public.planner_plan_legacy_goal_links from public, anon, authenticated;
grant select on public.planner_plans, public.planner_plan_milestones,
  public.planner_plan_measurements, public.planner_plan_measurement_history,
  public.planner_plan_manual_conditions, public.planner_plan_requirements,
  public.planner_plan_operations, public.planner_plan_legacy_goal_links to authenticated;
grant select, insert, update, delete on public.planner_plans, public.planner_plan_milestones,
  public.planner_plan_measurements, public.planner_plan_measurement_history,
  public.planner_plan_manual_conditions, public.planner_plan_requirements,
  public.planner_plan_operations, public.planner_plan_legacy_goal_links to service_role;

-- --------------------------------------------------------------------------
-- Separate, honest indicators. There is intentionally no percentage column.
-- --------------------------------------------------------------------------

create view public.planner_plan_indicators
with (security_invoker = true)
as
select p.id as plan_id,
  count(distinct m.id) filter (where m.trashed_at is null) as milestone_count,
  count(distinct m.id) filter (where m.trashed_at is null and m.lifecycle = 'completed') as completed_milestone_count,
  count(distinct x.id) filter (where x.trashed_at is null) as measurement_count,
  count(distinct x.id) filter (
    where x.trashed_at is null and x.target_value is not null and
      case x.target_operator when 'gte' then x.current_value >= x.target_value
        when 'lte' then x.current_value <= x.target_value
        when 'eq' then x.current_value = x.target_value end
  ) as reached_measurement_count,
  count(distinct r.id) filter (
    where r.trashed_at is null and r.parent_requirement_id is null and r.classification = 'necessary'
  ) as necessary_requirement_count,
  count(distinct r.id) filter (
    where r.trashed_at is null and r.parent_requirement_id is null and r.classification = 'necessary'
      and public.planner_plan_requirement_satisfied(r.id)
  ) as satisfied_necessary_requirement_count,
  count(distinct r.id) filter (
    where r.trashed_at is null and r.parent_requirement_id is null and r.classification = 'supporting'
  ) as supporting_requirement_count
from public.planner_plans p
left join public.planner_plan_milestones m on m.plan_id = p.id
left join public.planner_plan_measurements x on x.plan_id = p.id
left join public.planner_plan_requirements r on r.plan_id = p.id
group by p.id;

grant select on public.planner_plan_indicators to authenticated, service_role;

-- --------------------------------------------------------------------------
-- Idempotent, versioned, audited Plan-graph writer.
-- All actor fields are derived from auth.uid()/current_person_id().
-- --------------------------------------------------------------------------

create or replace function public.planner_plan_safe_audit_state(
  p_entity_type text,
  p_plan_id uuid,
  p_entity_id uuid
)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  v_state jsonb;
begin
  if p_entity_type = 'plan' then
    select jsonb_build_object(
      'version',version,'lifecycle',lifecycle,
      'archived',archived_at is not null,'trashed',trashed_at is not null
    ) into v_state from public.planner_plans where id=p_plan_id;
  elsif p_entity_type = 'milestone' then
    select jsonb_build_object(
      'version',version,'lifecycle',lifecycle,'trashed',trashed_at is not null
    ) into v_state from public.planner_plan_milestones where id=p_entity_id and plan_id=p_plan_id;
  elsif p_entity_type = 'measurement' then
    select jsonb_build_object(
      'version',version,'target_configured',target_value is not null,'trashed',trashed_at is not null
    ) into v_state from public.planner_plan_measurements where id=p_entity_id and plan_id=p_plan_id;
  elsif p_entity_type = 'manual_condition' then
    select jsonb_build_object(
      'version',version,'satisfied',is_satisfied,'trashed',trashed_at is not null
    ) into v_state from public.planner_plan_manual_conditions where id=p_entity_id and plan_id=p_plan_id;
  elsif p_entity_type = 'requirement' then
    select jsonb_build_object(
      'version',version,'classification',classification,
      'has_parent',parent_requirement_id is not null,'trashed',trashed_at is not null
    ) into v_state from public.planner_plan_requirements where id=p_entity_id and plan_id=p_plan_id;
  end if;
  return v_state;
end;
$$;

create or replace function public.write_planner_plan_graph_rpc(
  p_mutation_id text,
  p_idempotency_key text,
  p_request_hash text,
  p_entity_type text,
  p_action text,
  p_plan_id uuid default null,
  p_entity_id uuid default null,
  p_expected_version integer default null,
  p_expected_plan_version integer default null,
  p_payload jsonb default '{}'::jsonb,
  p_request_id text default null,
  p_canonical_reserved boolean default false,
  p_canonical_operation text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor_person_id uuid := public.current_person_id();
  v_actor_member_id uuid;
  v_plan public.planner_plans%rowtype;
  v_milestone public.planner_plan_milestones%rowtype;
  v_measurement public.planner_plan_measurements%rowtype;
  v_condition public.planner_plan_manual_conditions%rowtype;
  v_requirement public.planner_plan_requirements%rowtype;
  v_operation public.planner_plan_operations%rowtype;
  v_canonical_row public.planner_idempotency_keys%rowtype;
  v_canonical_reservation jsonb;
  v_canonical_operation text;
  v_response jsonb;
  v_inserted integer;
  v_transition text;
  v_new_id uuid;
  v_action_name text;
  v_classification text;
  v_scope text;
  v_household_id uuid;
  v_previous_value numeric;
  v_outcome text;
  v_before_state jsonb;
  v_result_state jsonb;
  v_previous_version integer;
  v_result_version integer;
  v_error_status integer;
  v_error_code text;
  v_error_message text;
  v_error_details jsonb;
  v_error_body jsonb;
  v_error_detail_text text;
begin
  if auth.uid() is null or v_actor_person_id is null then
    raise exception 'authenticated actor required' using errcode = '42501';
  end if;
  if p_mutation_id is null or p_mutation_id !~ '^[A-Za-z0-9._:-]{1,128}$' then
    raise exception 'invalid mutation id' using errcode = '22023';
  end if;
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9._:-]{1,128}$' then
    raise exception 'invalid idempotency key' using errcode = '22023';
  end if;
  if p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid request hash' using errcode = '22023';
  end if;
  if p_entity_type not in ('plan','milestone','measurement','manual_condition','requirement') then
    raise exception 'invalid Plan graph entity type' using errcode = '22023';
  end if;

  v_canonical_operation := coalesce(nullif(p_canonical_operation,''),
    'planner.plans.' || p_entity_type || '.' || p_action);

  -- Resolve and lock ownership before selecting the scope-specific replay
  -- authority. Household Draft privacy is enforced by planner_plan_can_mutate.
  if p_entity_type = 'plan' and p_action = 'create' then
    v_scope := coalesce(p_payload ->> 'scope', 'personal');
    if v_scope not in ('personal','household') then
      raise exception 'invalid Plan scope' using errcode = '22023';
    end if;
    if nullif(btrim(p_payload ->> 'objective'), '') is null then
      raise exception 'Plan objective is required' using errcode = '22023';
    end if;
    if v_scope = 'household' then
      v_household_id := nullif(p_payload ->> 'household_id', '')::uuid;
      v_actor_member_id := public.current_household_member_id(v_household_id);
      if v_actor_member_id is null
        or not public.planner_plan_actor_has_capability(v_household_id, 'planner.view')
        or not public.planner_plan_actor_has_capability(v_household_id, 'goal.create_household') then
        raise exception 'household Plan create forbidden' using errcode = '42501';
      end if;
    end if;
  else
    select * into v_plan from public.planner_plans where id = p_plan_id for update;
    if not found then raise exception 'Plan not found' using errcode = 'P0002'; end if;
    v_scope := v_plan.scope;
    v_household_id := v_plan.household_id;
    if not public.planner_plan_can_mutate(v_plan.id,
      case when p_entity_type = 'plan' then
        case when p_action='transition' then coalesce(p_payload->>'transition',p_action) else p_action end
        when p_action in ('trash','restore') then p_action else 'edit' end) then
      raise exception 'Plan graph mutation forbidden' using errcode = '42501';
    end if;
    v_actor_member_id := case when v_plan.scope = 'household'
      then public.current_household_member_id(v_plan.household_id) else null end;
  end if;

  -- Household replay authority is the canonical shared table. The controller
  -- may reserve through withIdempotency; direct authenticated RPC calls reserve
  -- through the same canonical RPC inside this transaction.
  if v_scope = 'household' then
    if p_canonical_reserved then
      select * into v_canonical_row from public.planner_idempotency_keys
      where household_id=v_household_id and actor_member_id=v_actor_member_id
        and idempotency_key=p_idempotency_key and operation=v_canonical_operation
      for update;
      if not found then raise exception 'canonical idempotency reservation required' using errcode='42501'; end if;
      if v_canonical_row.request_hash <> p_request_hash then
        raise exception 'idempotency key conflict' using errcode='P0008';
      end if;
      if v_canonical_row.response_status <> 0 then
        return case when v_canonical_row.response_status between 200 and 299
          then jsonb_set(v_canonical_row.response_body,'{outcome}','"replay"'::jsonb,true)
          else v_canonical_row.response_body end;
      end if;
    else
      v_canonical_reservation := public.reserve_planner_idempotency_key(
        v_household_id,v_actor_member_id,p_idempotency_key,v_canonical_operation,p_request_hash,86400
      );
      if v_canonical_reservation->>'status' = 'replay' then
        return case when (v_canonical_reservation->>'response_status')::integer between 200 and 299
          then jsonb_set(v_canonical_reservation->'response_body','{outcome}','"replay"'::jsonb,true)
          else v_canonical_reservation->'response_body' end;
      elsif v_canonical_reservation->>'status' = 'in_flight' then
        raise exception 'operation still in flight' using errcode='P0009';
      end if;
    end if;
  else
    insert into public.planner_plan_operations (
      actor_person_id, mutation_id, idempotency_key, request_hash, operation, aggregate_type
    ) values (
      v_actor_person_id, p_mutation_id, p_idempotency_key, p_request_hash,
      p_entity_type || '.' || p_action, p_entity_type
    ) on conflict (actor_person_id, idempotency_key) do nothing;
    get diagnostics v_inserted = row_count;

    if v_inserted = 0 then
      select * into v_operation from public.planner_plan_operations
      where actor_person_id = v_actor_person_id and idempotency_key = p_idempotency_key
      for update;
      if v_operation.request_hash <> p_request_hash
        or v_operation.operation <> p_entity_type || '.' || p_action then
        raise exception 'idempotency key conflict' using errcode = 'P0008';
      end if;
      if v_operation.response_body is null then
        raise exception 'operation still in flight' using errcode = 'P0009';
      end if;
      return jsonb_set(v_operation.response_body, '{outcome}', '"replay"'::jsonb, true);
    end if;
  end if;

  -- Expected business errors are captured only for a canonical reservation
  -- made by the backend in a prior transaction. This lets withIdempotency replay
  -- a stable 4xx without leaving a false successful result. Direct RPC errors
  -- are re-raised so the in-transaction reservation rolls back.
  begin
  if p_entity_type = 'plan' and p_action = 'create' then
    insert into public.planner_plans (
      scope, owner_person_id, household_id, objective, description, lifecycle,
      target_date, finalization_kind, created_by_person_id, created_by_member_id
    ) values (
      v_scope,
      case when v_scope = 'personal' then v_actor_person_id else null end,
      case when v_scope = 'household' then v_household_id else null end,
      btrim(p_payload ->> 'objective'), nullif(btrim(p_payload ->> 'description'), ''),
      'draft', nullif(p_payload ->> 'target_date', '')::date,
      coalesce(nullif(p_payload ->> 'finalization_kind', ''), 'none'),
      v_actor_person_id, v_actor_member_id
    ) returning * into v_plan;
    v_new_id := v_plan.id;
    v_response := jsonb_build_object('data', to_jsonb(v_plan), 'outcome', 'created', 'version', v_plan.version, 'operationId', p_mutation_id);
    v_outcome := 'created';
    v_action_name := 'plan.created';

  else
    if p_entity_type = 'plan' then
      if p_expected_version is null then raise exception 'expected version required' using errcode = '22023'; end if;
      if v_plan.version <> p_expected_version then
        raise exception 'Plan version conflict' using errcode = '40007',
          detail = jsonb_build_object('current',v_plan.version,'expected',p_expected_version,'resource','plan')::text;
      end if;
      v_before_state := public.planner_plan_safe_audit_state('plan',v_plan.id,v_plan.id);
      v_previous_version := v_plan.version;
      if p_action = 'update' then
        if v_plan.trashed_at is not null then
          raise exception 'trashed Plan only permits Plan-level restore' using errcode='55000';
        end if;
        -- Semantic noop detection (M11.3A R2A-R1-REAUD-02). Compute the proposed
        -- normalized canonical Plan state using the exact same field semantics
        -- as the UPDATE below would apply (omitted field preserves the current
        -- value; explicit null/empty coerces per existing contract). When every
        -- normalized editable column is not distinct from the current row, the
        -- request is a canonical noop: no UPDATE, no version/timestamp change,
        -- no audit, no history. Version checks and authorization already ran.
        begin
          if
            coalesce(nullif(btrim(p_payload ->> 'objective'), ''), v_plan.objective) is not distinct from v_plan.objective
            and (case when p_payload ? 'description' then nullif(btrim(p_payload ->> 'description'), '') else v_plan.description end)
              is not distinct from v_plan.description
            and (case when p_payload ? 'target_date' then nullif(p_payload ->> 'target_date', '')::date else v_plan.target_date end)
              is not distinct from v_plan.target_date
            and coalesce(nullif(p_payload ->> 'finalization_kind', ''), v_plan.finalization_kind) is not distinct from v_plan.finalization_kind
          then
            v_outcome := 'noop';
          else
            update public.planner_plans set
              objective = coalesce(nullif(btrim(p_payload ->> 'objective'), ''), objective),
              description = case when p_payload ? 'description' then nullif(btrim(p_payload ->> 'description'), '') else description end,
              target_date = case when p_payload ? 'target_date' then nullif(p_payload ->> 'target_date', '')::date else target_date end,
              finalization_kind = coalesce(nullif(p_payload ->> 'finalization_kind', ''), finalization_kind)
            where id = v_plan.id returning * into v_plan;
            v_outcome := 'updated';
          end if;
        exception when datatype_mismatch or datetime_field_overflow or invalid_text_representation then
          raise exception 'invalid Plan update payload' using errcode = '22023';
        end;
        v_action_name := case when v_outcome = 'noop' then null else 'plan.updated' end;
      elsif p_action = 'transition' then
        v_transition := p_payload ->> 'transition';
        if not public.planner_plan_can_mutate(v_plan.id, v_transition) then
          raise exception 'Plan transition forbidden' using errcode = '42501';
        end if;
        if v_plan.trashed_at is not null and v_transition = 'trash' then
          v_outcome := 'noop';
        elsif v_plan.trashed_at is not null and v_transition <> 'restore' then
          raise exception 'trashed Plan only permits Plan-level restore' using errcode='55000';
        elsif v_plan.trashed_at is null and v_transition = 'restore' then
          v_outcome := 'noop';
        elsif (v_transition='activate' and v_plan.lifecycle='active')
          or (v_transition='pause' and v_plan.lifecycle='paused')
          or (v_transition in ('resume','reopen') and v_plan.lifecycle='active')
          or (v_transition='complete' and v_plan.lifecycle='completed')
          or (v_transition='close' and v_plan.lifecycle='closed') then
          v_outcome := 'noop';
        elsif v_transition='archive' and v_plan.lifecycle in ('completed','closed') and v_plan.archived_at is not null then
          v_outcome := 'noop';
        elsif v_transition='unarchive' and v_plan.lifecycle in ('completed','closed') and v_plan.archived_at is null then
          v_outcome := 'noop';
        elsif v_transition = 'activate' and v_plan.lifecycle = 'draft' then
          if not exists (
            select 1 from public.planner_plan_milestones where plan_id = v_plan.id and trashed_at is null
            union all select 1 from public.planner_plan_measurements where plan_id = v_plan.id and trashed_at is null
            union all select 1 from public.planner_plan_manual_conditions where plan_id = v_plan.id and trashed_at is null
          ) then raise exception 'Plan requires useful structure before activation' using errcode = '55000'; end if;
          if exists (
            select 1 from public.planner_plan_requirements
            where plan_id=v_plan.id and trashed_at is null
              and subject_type='external' and classification='necessary'
          ) then raise exception 'unbound external requirement prevents activation' using errcode = '55000'; end if;
          update public.planner_plans set lifecycle='active', activated_at=now(), paused_at=null where id=v_plan.id returning * into v_plan;
          v_outcome := 'updated';
        elsif v_transition = 'pause' and v_plan.lifecycle = 'active' then
          update public.planner_plans set lifecycle='paused', paused_at=now() where id=v_plan.id returning * into v_plan;
          v_outcome := 'updated';
        elsif v_transition = 'resume' and v_plan.lifecycle = 'paused' then
          update public.planner_plans set lifecycle='active', paused_at=null where id=v_plan.id returning * into v_plan;
          v_outcome := 'updated';
        elsif v_transition = 'complete' and v_plan.lifecycle in ('active','paused') then
          if exists (
            select 1 from public.planner_plan_requirements r
            where r.plan_id=v_plan.id and r.trashed_at is null
              and r.parent_requirement_id is null and r.classification='necessary'
              and not public.planner_plan_requirement_satisfied(r.id)
          ) and coalesce((p_payload->>'confirm_unresolved')::boolean,false) is not true then
            raise exception 'unresolved necessary requirements require explicit confirmation' using errcode = '55000';
          end if;
          update public.planner_plans set lifecycle='completed', completed_at=now(), paused_at=null where id=v_plan.id returning * into v_plan;
          v_outcome := 'updated';
        elsif v_transition = 'close' and v_plan.lifecycle in ('active','paused') then
          update public.planner_plans set lifecycle='closed', closed_at=now(), closed_reason=nullif(btrim(p_payload ->> 'closed_reason'), ''), paused_at=null where id=v_plan.id returning * into v_plan;
          v_outcome := 'updated';
        elsif v_transition = 'reopen' and v_plan.lifecycle in ('completed','closed') then
          update public.planner_plans set lifecycle='active', archived_at=null where id=v_plan.id returning * into v_plan;
          v_outcome := 'updated';
        elsif v_transition = 'archive' and v_plan.lifecycle in ('completed','closed') and v_plan.trashed_at is null then
          update public.planner_plans set archived_at=now() where id=v_plan.id returning * into v_plan;
          v_outcome := 'updated';
        elsif v_transition = 'unarchive' and v_plan.lifecycle in ('completed','closed') then
          update public.planner_plans set archived_at=null where id=v_plan.id returning * into v_plan;
          v_outcome := 'updated';
        elsif v_transition = 'trash' and v_plan.trashed_at is null then
          update public.planner_plans set trashed_at=now(), trashed_by_person_id=v_actor_person_id,
            trashed_by_member_id=v_actor_member_id, trash_operation_id=p_mutation_id
          where id=v_plan.id returning * into v_plan;
          v_outcome := 'updated';
        elsif v_transition = 'restore' and v_plan.trashed_at is not null then
          update public.planner_plans set trashed_at=null, trashed_by_person_id=null,
            trashed_by_member_id=null, trash_operation_id=null
          where id=v_plan.id returning * into v_plan;
          v_outcome := 'updated';
        else
          raise exception 'invalid Plan lifecycle transition' using errcode = '55000';
        end if;
        v_action_name := case when v_outcome='noop' then null else case v_transition
          when 'activate' then 'plan.activated'
          when 'pause' then 'plan.paused'
          when 'resume' then 'plan.resumed'
          when 'complete' then 'plan.completed'
          when 'close' then 'plan.closed'
          when 'reopen' then 'plan.reopened'
          when 'archive' then 'plan.archived'
          when 'unarchive' then 'plan.unarchived'
          when 'trash' then 'plan.trashed'
          when 'restore' then 'plan.restored'
        end end;
      else
        raise exception 'invalid Plan action' using errcode = '22023';
      end if;
      v_response := jsonb_build_object('data', to_jsonb(v_plan), 'outcome', v_outcome, 'version', v_plan.version, 'operationId', p_mutation_id);

    elsif p_entity_type = 'milestone' then
      if v_plan.trashed_at is not null then raise exception 'Plan graph is in Trash' using errcode='55000'; end if;
      if v_plan.lifecycle in ('completed','closed') then raise exception 'terminal Plan requires explicit reopen' using errcode='55000'; end if;
      if p_expected_plan_version is null then raise exception 'expected Plan version required' using errcode='22023'; end if;
      if v_plan.version <> p_expected_plan_version then
        raise exception 'Plan graph version conflict' using errcode='40007',
          detail=jsonb_build_object('current',v_plan.version,'expected',p_expected_plan_version,'resource','plan')::text;
      end if;
      if p_action = 'create' then
        v_classification := coalesce(p_payload ->> 'classification', 'necessary');
        insert into public.planner_plan_milestones (plan_id,title,description,completion_mode,classification,sort_order)
        values (v_plan.id,btrim(p_payload->>'title'),nullif(btrim(p_payload->>'description'),''),
          coalesce(p_payload->>'completion_mode','manual'),v_classification,coalesce((p_payload->>'sort_order')::integer,0))
        returning * into v_milestone;
        v_new_id := v_milestone.id;
        insert into public.planner_plan_requirements (plan_id,subject_type,milestone_id,classification,sort_order)
        values (v_plan.id,'milestone',v_milestone.id,v_classification,v_milestone.sort_order);
        v_action_name := 'milestone.created';
        v_outcome := 'created';
      else
        select * into v_milestone from public.planner_plan_milestones where id=p_entity_id and plan_id=v_plan.id for update;
        if not found then raise exception 'Milestone not found' using errcode='P0002'; end if;
        if p_expected_version is null then raise exception 'expected version required' using errcode='22023'; end if;
        if v_milestone.version <> p_expected_version then
          raise exception 'Milestone version conflict' using errcode='40007',
            detail=jsonb_build_object('current',v_milestone.version,'expected',p_expected_version,'resource','node')::text;
        end if;
        v_before_state := public.planner_plan_safe_audit_state('milestone',v_plan.id,v_milestone.id);
        v_previous_version := v_milestone.version;
        if p_action = 'update' then
          begin
            if
              coalesce(nullif(btrim(p_payload->>'title'),''), v_milestone.title) is not distinct from v_milestone.title
              and (case when p_payload ? 'description' then nullif(btrim(p_payload->>'description'),'') else v_milestone.description end)
                is not distinct from v_milestone.description
              and coalesce(p_payload->>'classification', v_milestone.classification) is not distinct from v_milestone.classification
              and coalesce((p_payload->>'sort_order')::integer, v_milestone.sort_order) is not distinct from v_milestone.sort_order
            then
              v_outcome := 'noop';
            else
              update public.planner_plan_milestones set
                title=coalesce(nullif(btrim(p_payload->>'title'),''),title),
                description=case when p_payload ? 'description' then nullif(btrim(p_payload->>'description'),'') else description end,
                classification=coalesce(p_payload->>'classification',classification),
                sort_order=coalesce((p_payload->>'sort_order')::integer,sort_order)
              where id=v_milestone.id returning * into v_milestone;
              update public.planner_plan_requirements set classification=v_milestone.classification
              where milestone_id=v_milestone.id and trashed_at is null;
              v_outcome := 'updated';
            end if;
          exception when datatype_mismatch or invalid_text_representation then
            raise exception 'invalid Milestone update payload' using errcode = '22023';
          end;
        elsif p_action = 'complete' and v_milestone.completion_mode='manual' then
          if v_milestone.lifecycle='completed' then v_outcome := 'noop'; else
            update public.planner_plan_milestones set lifecycle='completed',completed_at=now(),
              completed_by_person_id=v_actor_person_id,completed_by_member_id=v_actor_member_id
            where id=v_milestone.id returning * into v_milestone;
            v_outcome := 'updated';
          end if;
        elsif p_action = 'reopen' and v_milestone.completion_mode='manual' then
          if v_milestone.lifecycle='pending' then v_outcome := 'noop'; else
            update public.planner_plan_milestones set lifecycle='pending',completed_at=null,
              completed_by_person_id=null,completed_by_member_id=null
            where id=v_milestone.id returning * into v_milestone;
            v_outcome := 'updated';
          end if;
        elsif p_action = 'trash' then
          if v_milestone.trashed_at is not null then v_outcome := 'noop'; else
            update public.planner_plan_milestones set trashed_at=now(),trashed_by_person_id=v_actor_person_id,
              trashed_by_member_id=v_actor_member_id where id=v_milestone.id returning * into v_milestone;
            update public.planner_plan_requirements set trashed_at=now(),trashed_by_person_id=v_actor_person_id,
              trashed_by_member_id=v_actor_member_id where milestone_id=v_milestone.id and trashed_at is null;
            v_outcome := 'updated';
          end if;
        elsif p_action = 'restore' then
          if v_milestone.trashed_at is null then v_outcome := 'noop'; else
            update public.planner_plan_milestones set trashed_at=null,trashed_by_person_id=null,
              trashed_by_member_id=null where id=v_milestone.id returning * into v_milestone;
            update public.planner_plan_requirements set trashed_at=null,trashed_by_person_id=null,
              trashed_by_member_id=null where milestone_id=v_milestone.id;
            v_outcome := 'updated';
          end if;
        else raise exception 'invalid Milestone action' using errcode='55000'; end if;
        v_new_id := v_milestone.id;
        v_action_name := case when v_outcome='noop' then null else case p_action
          when 'update' then 'milestone.updated' when 'complete' then 'milestone.completed'
          when 'reopen' then 'milestone.reopened' when 'trash' then 'milestone.trashed'
          when 'restore' then 'milestone.restored' end end;
      end if;
      if v_outcome <> 'noop' then perform public.planner_plan_recompute_automatic_milestones(v_plan.id); end if;
      select * into v_milestone from public.planner_plan_milestones where id=v_new_id;
      v_response := jsonb_build_object('data',to_jsonb(v_milestone),'outcome',v_outcome,'version',v_milestone.version,'operationId',p_mutation_id);

    elsif p_entity_type = 'measurement' then
      if v_plan.trashed_at is not null then raise exception 'Plan graph is in Trash' using errcode='55000'; end if;
      if v_plan.lifecycle in ('completed','closed') then raise exception 'terminal Plan requires explicit reopen' using errcode='55000'; end if;
      if p_expected_plan_version is null then raise exception 'expected Plan version required' using errcode='22023'; end if;
      if v_plan.version <> p_expected_plan_version then
        raise exception 'Plan graph version conflict' using errcode='40007',
          detail=jsonb_build_object('current',v_plan.version,'expected',p_expected_plan_version,'resource','plan')::text;
      end if;
      if p_action = 'create' then
        v_classification := coalesce(p_payload->>'classification','necessary');
        insert into public.planner_plan_measurements (plan_id,name,current_value,target_value,unit,target_operator,classification,sort_order)
        values (v_plan.id,btrim(p_payload->>'name'),coalesce((p_payload->>'current_value')::numeric,0),
          nullif(p_payload->>'target_value','')::numeric,btrim(p_payload->>'unit'),
          coalesce(p_payload->>'target_operator','gte'),v_classification,coalesce((p_payload->>'sort_order')::integer,0))
        returning * into v_measurement;
        v_new_id := v_measurement.id;
        insert into public.planner_plan_requirements (plan_id,subject_type,measurement_id,classification,sort_order)
        values (v_plan.id,'measurement',v_measurement.id,v_classification,v_measurement.sort_order);
        insert into public.planner_plan_measurement_history (plan_id,measurement_id,value,previous_value,recorded_by_person_id,recorded_by_member_id,operation_id)
        values (v_plan.id,v_measurement.id,v_measurement.current_value,null,v_actor_person_id,v_actor_member_id,p_mutation_id);
        v_action_name := 'measurement.created';
        v_outcome := 'created';
      else
        select * into v_measurement from public.planner_plan_measurements where id=p_entity_id and plan_id=v_plan.id for update;
        if not found then raise exception 'Measurement not found' using errcode='P0002'; end if;
        if p_expected_version is null then raise exception 'expected version required' using errcode='22023'; end if;
        if v_measurement.version <> p_expected_version then
          raise exception 'Measurement version conflict' using errcode='40007',
            detail=jsonb_build_object('current',v_measurement.version,'expected',p_expected_version,'resource','node')::text;
        end if;
        v_new_id := v_measurement.id;
        v_before_state := public.planner_plan_safe_audit_state('measurement',v_plan.id,v_measurement.id);
        v_previous_version := v_measurement.version;
        if p_action = 'update' then
          begin
            if
              coalesce(nullif(btrim(p_payload->>'name'),''), v_measurement.name) is not distinct from v_measurement.name
              and (case when p_payload ? 'target_value' then nullif(p_payload->>'target_value','')::numeric else v_measurement.target_value end)
                is not distinct from v_measurement.target_value
              and coalesce(nullif(btrim(p_payload->>'unit'),''), v_measurement.unit) is not distinct from v_measurement.unit
              and coalesce(p_payload->>'target_operator', v_measurement.target_operator) is not distinct from v_measurement.target_operator
              and coalesce(p_payload->>'classification', v_measurement.classification) is not distinct from v_measurement.classification
              and coalesce((p_payload->>'sort_order')::integer, v_measurement.sort_order) is not distinct from v_measurement.sort_order
            then
              v_outcome := 'noop';
            else
              update public.planner_plan_measurements set name=coalesce(nullif(btrim(p_payload->>'name'),''),name),
                target_value=case when p_payload ? 'target_value' then nullif(p_payload->>'target_value','')::numeric else target_value end,
                unit=coalesce(nullif(btrim(p_payload->>'unit'),''),unit),
                target_operator=coalesce(p_payload->>'target_operator',target_operator),
                classification=coalesce(p_payload->>'classification',classification),
                sort_order=coalesce((p_payload->>'sort_order')::integer,sort_order)
              where id=v_measurement.id returning * into v_measurement;
              update public.planner_plan_requirements set classification=v_measurement.classification
              where measurement_id=v_measurement.id and trashed_at is null;
              v_outcome := 'updated';
            end if;
          exception when datatype_mismatch or invalid_text_representation then
            raise exception 'invalid Measurement update payload' using errcode = '22023';
          end;
        elsif p_action = 'record' then
          v_previous_value := v_measurement.current_value;
          update public.planner_plan_measurements set current_value=(p_payload->>'value')::numeric
          where id=v_measurement.id returning * into v_measurement;
          insert into public.planner_plan_measurement_history (plan_id,measurement_id,value,previous_value,recorded_by_person_id,recorded_by_member_id,correction_of_id,operation_id)
          values (v_plan.id,v_measurement.id,v_measurement.current_value,v_previous_value,
            v_actor_person_id,v_actor_member_id,nullif(p_payload->>'correction_of_id','')::uuid,p_mutation_id);
          v_outcome := 'updated';
        elsif p_action = 'trash' then
          if v_measurement.trashed_at is not null then v_outcome := 'noop'; else
            update public.planner_plan_measurements set trashed_at=now(),trashed_by_person_id=v_actor_person_id,
              trashed_by_member_id=v_actor_member_id where id=v_measurement.id returning * into v_measurement;
            update public.planner_plan_requirements set trashed_at=now(),trashed_by_person_id=v_actor_person_id,
              trashed_by_member_id=v_actor_member_id where measurement_id=v_measurement.id and trashed_at is null;
            v_outcome := 'updated';
          end if;
        elsif p_action = 'restore' then
          if v_measurement.trashed_at is null then v_outcome := 'noop'; else
            update public.planner_plan_measurements set trashed_at=null,trashed_by_person_id=null,
              trashed_by_member_id=null where id=v_measurement.id returning * into v_measurement;
            update public.planner_plan_requirements set trashed_at=null,trashed_by_person_id=null,
              trashed_by_member_id=null where measurement_id=v_measurement.id;
            v_outcome := 'updated';
          end if;
        else raise exception 'invalid Measurement action' using errcode='55000'; end if;
        v_action_name := case when v_outcome='noop' then null else case p_action
          when 'update' then 'measurement.updated' when 'record' then 'measurement.recorded'
          when 'trash' then 'measurement.trashed' when 'restore' then 'measurement.restored' end end;
      end if;
      if v_outcome <> 'noop' then perform public.planner_plan_recompute_automatic_milestones(v_plan.id); end if;
      v_response := jsonb_build_object('data',to_jsonb(v_measurement),'outcome',v_outcome,'version',v_measurement.version,'operationId',p_mutation_id);

    elsif p_entity_type = 'manual_condition' then
      if v_plan.trashed_at is not null then raise exception 'Plan graph is in Trash' using errcode='55000'; end if;
      if v_plan.lifecycle in ('completed','closed') then raise exception 'terminal Plan requires explicit reopen' using errcode='55000'; end if;
      if p_expected_plan_version is null then raise exception 'expected Plan version required' using errcode='22023'; end if;
      if v_plan.version <> p_expected_plan_version then
        raise exception 'Plan graph version conflict' using errcode='40007',
          detail=jsonb_build_object('current',v_plan.version,'expected',p_expected_plan_version,'resource','plan')::text;
      end if;
      if p_action = 'create' then
        v_classification := coalesce(p_payload->>'classification','necessary');
        insert into public.planner_plan_manual_conditions (plan_id,label,classification,sort_order)
        values (v_plan.id,btrim(p_payload->>'label'),v_classification,coalesce((p_payload->>'sort_order')::integer,0))
        returning * into v_condition;
        v_new_id := v_condition.id;
        insert into public.planner_plan_requirements (plan_id,subject_type,manual_condition_id,classification,sort_order)
        values (v_plan.id,'manual_condition',v_condition.id,v_classification,v_condition.sort_order);
        v_action_name := 'manual_condition.created';
        v_outcome := 'created';
      else
        select * into v_condition from public.planner_plan_manual_conditions where id=p_entity_id and plan_id=v_plan.id for update;
        if not found then raise exception 'Manual condition not found' using errcode='P0002'; end if;
        if p_expected_version is null then raise exception 'expected version required' using errcode='22023'; end if;
        if v_condition.version <> p_expected_version then
          raise exception 'Manual condition version conflict' using errcode='40007',
            detail=jsonb_build_object('current',v_condition.version,'expected',p_expected_version,'resource','node')::text;
        end if;
        v_new_id := v_condition.id;
        v_before_state := public.planner_plan_safe_audit_state('manual_condition',v_plan.id,v_condition.id);
        v_previous_version := v_condition.version;
        if p_action = 'update' then
          begin
            if
              coalesce(nullif(btrim(p_payload->>'label'),''), v_condition.label) is not distinct from v_condition.label
              and coalesce(p_payload->>'classification', v_condition.classification) is not distinct from v_condition.classification
              and coalesce((p_payload->>'sort_order')::integer, v_condition.sort_order) is not distinct from v_condition.sort_order
            then
              v_outcome := 'noop';
            else
              update public.planner_plan_manual_conditions set label=coalesce(nullif(btrim(p_payload->>'label'),''),label),
                classification=coalesce(p_payload->>'classification',classification),
                sort_order=coalesce((p_payload->>'sort_order')::integer,sort_order)
              where id=v_condition.id returning * into v_condition;
              update public.planner_plan_requirements set classification=v_condition.classification
              where manual_condition_id=v_condition.id and trashed_at is null;
              v_outcome := 'updated';
            end if;
          exception when datatype_mismatch or invalid_text_representation then
            raise exception 'invalid manual condition update payload' using errcode = '22023';
          end;
        elsif p_action = 'set' then
          if v_condition.is_satisfied is not distinct from (p_payload->>'is_satisfied')::boolean then
            v_outcome := 'noop';
          else
            update public.planner_plan_manual_conditions set is_satisfied=(p_payload->>'is_satisfied')::boolean,
              satisfied_at=case when (p_payload->>'is_satisfied')::boolean then now() else null end,
              satisfied_by_person_id=case when (p_payload->>'is_satisfied')::boolean then v_actor_person_id else null end,
              satisfied_by_member_id=case when (p_payload->>'is_satisfied')::boolean then v_actor_member_id else null end
            where id=v_condition.id returning * into v_condition;
            v_outcome := 'updated';
          end if;
        elsif p_action = 'trash' then
          if v_condition.trashed_at is not null then v_outcome := 'noop'; else
            update public.planner_plan_manual_conditions set trashed_at=now(),trashed_by_person_id=v_actor_person_id,
              trashed_by_member_id=v_actor_member_id where id=v_condition.id returning * into v_condition;
            update public.planner_plan_requirements set trashed_at=now(),trashed_by_person_id=v_actor_person_id,
              trashed_by_member_id=v_actor_member_id where manual_condition_id=v_condition.id and trashed_at is null;
            v_outcome := 'updated';
          end if;
        elsif p_action = 'restore' then
          if v_condition.trashed_at is null then v_outcome := 'noop'; else
            update public.planner_plan_manual_conditions set trashed_at=null,trashed_by_person_id=null,
              trashed_by_member_id=null where id=v_condition.id returning * into v_condition;
            update public.planner_plan_requirements set trashed_at=null,trashed_by_person_id=null,
              trashed_by_member_id=null where manual_condition_id=v_condition.id;
            v_outcome := 'updated';
          end if;
        else raise exception 'invalid manual condition action' using errcode='55000'; end if;
        v_action_name := case when v_outcome='noop' then null else case p_action
          when 'update' then 'manual_condition.updated' when 'set' then 'manual_condition.changed'
          when 'trash' then 'manual_condition.trashed' when 'restore' then 'manual_condition.restored' end end;
      end if;
      if v_outcome <> 'noop' then perform public.planner_plan_recompute_automatic_milestones(v_plan.id); end if;
      v_response := jsonb_build_object('data',to_jsonb(v_condition),'outcome',v_outcome,'version',v_condition.version,'operationId',p_mutation_id);

    else
      if v_plan.trashed_at is not null then raise exception 'Plan graph is in Trash' using errcode='55000'; end if;
      if v_plan.lifecycle in ('completed','closed') then raise exception 'terminal Plan requires explicit reopen' using errcode='55000'; end if;
      if p_expected_plan_version is null then raise exception 'expected Plan version required' using errcode='22023'; end if;
      if v_plan.version <> p_expected_plan_version then
        raise exception 'Plan graph version conflict' using errcode='40007',
          detail=jsonb_build_object('current',v_plan.version,'expected',p_expected_plan_version,'resource','plan')::text;
      end if;
      if p_action = 'create' then
        insert into public.planner_plan_requirements (
          plan_id,parent_requirement_id,subject_type,milestone_id,measurement_id,manual_condition_id,
          external_kind,external_reference_key,external_entity_id,classification,sort_order
        ) values (
          v_plan.id,nullif(p_payload->>'parent_requirement_id','')::uuid,p_payload->>'subject_type',
          nullif(p_payload->>'milestone_id','')::uuid,nullif(p_payload->>'measurement_id','')::uuid,
          nullif(p_payload->>'manual_condition_id','')::uuid,p_payload->>'external_kind',
          nullif(p_payload->>'external_reference_key','')::uuid,null,
          p_payload->>'classification',coalesce((p_payload->>'sort_order')::integer,0)
        ) returning * into v_requirement;
        v_new_id := v_requirement.id;
        v_outcome := 'created';
      else
        select * into v_requirement from public.planner_plan_requirements where id=p_entity_id and plan_id=v_plan.id for update;
        if not found then raise exception 'Requirement not found' using errcode='P0002'; end if;
        if p_expected_version is null then raise exception 'expected version required' using errcode='22023'; end if;
        if v_requirement.version <> p_expected_version then
          raise exception 'Requirement version conflict' using errcode='40007',
            detail=jsonb_build_object('current',v_requirement.version,'expected',p_expected_version,'resource','node')::text;
        end if;
        v_new_id := v_requirement.id;
        v_before_state := public.planner_plan_safe_audit_state('requirement',v_plan.id,v_requirement.id);
        v_previous_version := v_requirement.version;
        if p_action = 'update' then
          begin
            if
              (case when p_payload ? 'parent_requirement_id' then nullif(p_payload->>'parent_requirement_id','')::uuid else v_requirement.parent_requirement_id end)
                is not distinct from v_requirement.parent_requirement_id
              and coalesce((p_payload->>'sort_order')::integer, v_requirement.sort_order) is not distinct from v_requirement.sort_order
            then
              v_outcome := 'noop';
            else
              update public.planner_plan_requirements set
                parent_requirement_id=case when p_payload ? 'parent_requirement_id' then nullif(p_payload->>'parent_requirement_id','')::uuid else parent_requirement_id end,
                sort_order=coalesce((p_payload->>'sort_order')::integer,sort_order)
              where id=v_requirement.id returning * into v_requirement;
              v_outcome := 'updated';
            end if;
          exception when datatype_mismatch or invalid_text_representation then
            raise exception 'invalid Requirement update payload' using errcode = '22023';
          end;
        elsif p_action = 'trash' then
          if v_requirement.trashed_at is not null then v_outcome := 'noop'; else
            if exists (select 1 from public.planner_plan_requirements where parent_requirement_id=v_requirement.id and trashed_at is null) then
              raise exception 'Requirement with active children cannot be trashed' using errcode='55000';
            end if;
            update public.planner_plan_requirements set trashed_at=now(),trashed_by_person_id=v_actor_person_id,
              trashed_by_member_id=v_actor_member_id where id=v_requirement.id returning * into v_requirement;
            v_outcome := 'updated';
          end if;
        elsif p_action = 'restore' then
          if v_requirement.trashed_at is null then v_outcome := 'noop'; else
            update public.planner_plan_requirements set trashed_at=null,trashed_by_person_id=null,
              trashed_by_member_id=null where id=v_requirement.id returning * into v_requirement;
            v_outcome := 'updated';
          end if;
        else raise exception 'invalid Requirement action' using errcode='55000'; end if;
      end if;
      if v_outcome <> 'noop' then perform public.planner_plan_recompute_automatic_milestones(v_plan.id); end if;
      v_action_name := case when v_outcome='noop' then null else case p_action
        when 'create' then 'requirement.created' when 'update' then 'requirement.updated'
        when 'trash' then 'requirement.trashed' when 'restore' then 'requirement.restored' end end;
      v_response := jsonb_build_object('data',to_jsonb(v_requirement),'outcome',v_outcome,'version',v_requirement.version,'operationId',p_mutation_id);
    end if;
  end if;

  if p_entity_type <> 'plan' and v_outcome <> 'noop' then
    -- The Plan version is the structural graph version and advances once for
    -- every effective child mutation. Child versions remain independently
    -- available for field-level optimistic concurrency.
    update public.planner_plans set updated_at=updated_at where id=v_plan.id returning * into v_plan;
    v_response := v_response || jsonb_build_object('planVersion',v_plan.version);
  elsif p_entity_type <> 'plan' then
    v_response := v_response || jsonb_build_object('planVersion',v_plan.version);
  end if;

  v_result_state := public.planner_plan_safe_audit_state(
    p_entity_type,v_plan.id,coalesce(v_new_id,p_entity_id,v_plan.id)
  );
  v_result_version := nullif(v_result_state->>'version','')::integer;
  if v_before_state is null and p_entity_type='plan' and p_action <> 'create' then
    v_before_state := jsonb_build_object('version',v_previous_version);
  end if;

  if v_plan.scope='personal' then
    update public.planner_plan_operations set
      aggregate_id=coalesce(v_new_id,p_entity_id,v_plan.id),
      previous_version=v_previous_version,result_version=v_result_version,
      before_state=v_before_state,result_state=v_result_state,outcome=v_outcome,
      response_body=v_response,completed_at=now()
    where actor_person_id=v_actor_person_id and idempotency_key=p_idempotency_key;
  end if;

  -- audit_events is household-scoped by its canonical schema. Personal Plan
  -- operations remain exactly-once in planner_plan_operations and never leak
  -- into household Activity.
  if v_plan.scope='household' and v_outcome <> 'noop' then
    insert into public.audit_events (
      household_id,actor_membership_id,actor_account_id,domain,action,
      aggregate_type,aggregate_id,result,request_id,mutation_id,metadata_version,metadata
    ) values (
      v_plan.household_id,v_actor_member_id,auth.uid(),'planner',v_action_name,
      p_entity_type,coalesce(v_new_id,p_entity_id,v_plan.id),'succeeded',p_request_id,p_mutation_id,1,
      jsonb_build_object(
        'plan_id',v_plan.id,'idempotency_key',p_idempotency_key,
        'previous_version',v_previous_version,'result_version',v_result_version,
        'before_state',coalesce(v_before_state,'null'::jsonb),
        'result_state',coalesce(v_result_state,'null'::jsonb),'outcome',v_outcome
      )
    );
  end if;
  if v_plan.scope='household' then
    perform public.complete_planner_idempotency_key(
      v_plan.household_id,v_actor_member_id,p_idempotency_key,v_canonical_operation,
      case when p_action='create' then 201 else 200 end,v_response
    );
  end if;
  return v_response;
  exception when others then
    get stacked diagnostics v_error_detail_text = PG_EXCEPTION_DETAIL;
    if v_scope='household' and p_canonical_reserved
      and sqlstate in ('40007','P0008','P0002','55000','42501','22023','22P02','22003','22007','23514','23505','23503','23502') then
      if sqlstate='40007' then
        v_error_status:=412; v_error_code:='version_conflict_v2';
        v_error_message:='La version del grafo cambio. Actualiza y reintenta.';
        begin v_error_details:=coalesce(v_error_detail_text,'{}')::jsonb;
        exception when others then v_error_details:='{}'::jsonb; end;
      elsif sqlstate='P0008' then
        v_error_status:=409; v_error_code:='idempotency_key_conflict';
        v_error_message:='La operacion ya fue usada con otros datos.'; v_error_details:='{}'::jsonb;
      elsif sqlstate='P0002' then
        v_error_status:=404; v_error_code:='not_found';
        v_error_message:='Plan o elemento no encontrado.'; v_error_details:='{}'::jsonb;
      elsif sqlstate='55000' then
        v_error_status:=409; v_error_code:='invalid_transition';
        v_error_message:='La operacion no es valida para el estado actual.'; v_error_details:='{}'::jsonb;
      elsif sqlstate='42501' then
        v_error_status:=403; v_error_code:='forbidden';
        v_error_message:='No tenes permiso para modificar este Plan.'; v_error_details:='{}'::jsonb;
      else
        v_error_status:=422; v_error_code:='validation_error';
        v_error_message:='El grafo del Plan no es valido.'; v_error_details:='{}'::jsonb;
      end if;
      v_error_body:=jsonb_build_object('error',jsonb_strip_nulls(jsonb_build_object(
        'code',v_error_code,'message',v_error_message,'request_id',p_request_id,
        'details',case when v_error_details='{}'::jsonb then null else v_error_details end
      )));
      perform public.complete_planner_idempotency_key(
        v_household_id,v_actor_member_id,p_idempotency_key,v_canonical_operation,
        v_error_status,v_error_body
      );
      return jsonb_build_object('__planError',true,'status',v_error_status,
        'code',v_error_code,'message',v_error_message,'details',v_error_details,'body',v_error_body);
    end if;
    raise;
  end;
end;
$$;

-- --------------------------------------------------------------------------
-- Read DTO and legacy compatibility report/projection
-- --------------------------------------------------------------------------

create or replace function public.read_planner_plan_graph_rpc(p_plan_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'plan', to_jsonb(p),
    'indicators', to_jsonb(i),
    'milestones', coalesce((select jsonb_agg(to_jsonb(m) order by m.sort_order,m.id) from public.planner_plan_milestones m where m.plan_id=p.id and m.trashed_at is null),'[]'::jsonb),
    'measurements', coalesce((select jsonb_agg(
      to_jsonb(x) || jsonb_build_object('history',coalesce((
        select jsonb_agg(to_jsonb(h) order by h.recorded_at,h.id)
        from public.planner_plan_measurement_history h where h.measurement_id=x.id
      ),'[]'::jsonb)) order by x.sort_order,x.id
    ) from public.planner_plan_measurements x where x.plan_id=p.id and x.trashed_at is null),'[]'::jsonb),
    'manualConditions', coalesce((select jsonb_agg(to_jsonb(c) order by c.sort_order,c.id) from public.planner_plan_manual_conditions c where c.plan_id=p.id and c.trashed_at is null),'[]'::jsonb),
    'requirements', coalesce((select jsonb_agg(
      to_jsonb(r) || jsonb_build_object('satisfied',public.planner_plan_requirement_satisfied(r.id))
      order by r.parent_requirement_id nulls first,r.sort_order,r.id
    ) from public.planner_plan_requirements r where r.plan_id=p.id and r.trashed_at is null),'[]'::jsonb),
    'draftIsolation', jsonb_build_object(
      'contained', p.lifecycle='draft',
      'operationalChildrenPublished', false,
      'appearsInHome', false,
      'notifies', false,
      'recurs', false
    )
  )
  from public.planner_plans p
  left join public.planner_plan_indicators i on i.plan_id=p.id
  where p.id=p_plan_id and p.trashed_at is null
$$;

create view public.planner_legacy_goal_plan_projection
with (security_invoker = true)
as
select g.id as legacy_goal_id,
  l.plan_id,
  'legacy_goal'::text as source,
  g.title as objective,
  g.visibility as legacy_visibility,
  g.household_id,
  g.created_by_member_id as legacy_owner_member_id,
  g.status as legacy_lifecycle,
  g.progress_mode as legacy_exclusive_progress_mode,
  g.current_value as legacy_current_value,
  g.target_value as legacy_target_value,
  g.unit as legacy_unit,
  case when l.plan_id is null then 'requires_review' else 'reviewed_manual_mapping' end as compatibility_state,
  g.version as legacy_version,
  g.trashed_at
from public.planner_goals g
left join public.planner_plan_legacy_goal_links l on l.legacy_goal_id=g.id;

create or replace function public.planner_m11_3a_legacy_compatibility_report()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with visible as (
    select g.id,g.visibility,g.household_id,g.progress_mode,l.plan_id
    from public.planner_goals g
    left join public.planner_plan_legacy_goal_links l on l.legacy_goal_id=g.id
    where public.current_household_member_id(g.household_id) is not null
      and public.planner_plan_actor_has_capability(g.household_id,'planner.view')
      and (
        g.visibility='household'
        or g.created_by_member_id=public.current_household_member_id(g.household_id)
      )
  ), modes as (
    select progress_mode,count(*) as mode_count from visible group by progress_mode
  )
  select jsonb_build_object(
    'legacyGoalCount',(select count(*) from visible),
    'unmappedLegacyGoalCount',(select count(*) from visible where plan_id is null),
    'reviewedMappingCount',(select count(*) from visible where plan_id is not null),
    'personalStillHouseholdBoundCount',(select count(*) from visible where visibility='personal' and household_id is not null),
    'exclusiveProgressModeCounts',(select coalesce(jsonb_object_agg(progress_mode,mode_count),'{}'::jsonb) from modes),
    'automaticBackfillSafe',false,
    'strategy','preserve_and_report',
    'visibleMappingReviewComplete',(select count(*) from visible where plan_id is null)=0,
    -- Final retirement also depends on Integration-owned Task/Event migration,
    -- consumer cutover and restore/history parity; M11.3A cannot assert it.
    'visualGoalRetirementReady',false
  )
$$;

grant select on public.planner_legacy_goal_plan_projection to authenticated, service_role;
revoke all on function public.write_planner_plan_graph_rpc(text,text,text,text,text,uuid,uuid,integer,integer,jsonb,text,boolean,text) from public, anon;
grant execute on function public.write_planner_plan_graph_rpc(text,text,text,text,text,uuid,uuid,integer,integer,jsonb,text,boolean,text) to authenticated, service_role;
revoke all on function public.read_planner_plan_graph_rpc(uuid) from public, anon;
grant execute on function public.read_planner_plan_graph_rpc(uuid) to authenticated, service_role;
revoke all on function public.planner_m11_3a_legacy_compatibility_report() from public, anon;
grant execute on function public.planner_m11_3a_legacy_compatibility_report() to authenticated, service_role;

revoke all on function public.planner_plan_actor_has_capability(uuid,text) from public, anon;
grant execute on function public.planner_plan_actor_has_capability(uuid,text) to authenticated, service_role;
revoke all on function public.planner_plan_can_read(uuid,boolean) from public, anon;
grant execute on function public.planner_plan_can_read(uuid,boolean) to authenticated, service_role;
revoke all on function public.planner_plan_can_mutate(uuid,text) from public, anon;
grant execute on function public.planner_plan_can_mutate(uuid,text) to authenticated, service_role;
revoke all on function public.planner_plan_authorization_context_rpc(uuid) from public, anon;
grant execute on function public.planner_plan_authorization_context_rpc(uuid) to authenticated, service_role;
revoke all on function public.planner_plan_requirement_satisfied(uuid) from public, anon;
grant execute on function public.planner_plan_requirement_satisfied(uuid) to authenticated, service_role;
revoke all on function public.planner_plan_requirement_satisfied_internal(uuid,uuid[]) from public, anon, authenticated;
revoke all on function public.planner_plan_safe_audit_state(text,uuid,uuid) from public, anon, authenticated;
revoke all on function public.planner_plan_recompute_automatic_milestones(uuid) from public, anon, authenticated;
revoke all on function public.planner_plan_touch_version() from public, anon, authenticated;
revoke all on function public.planner_plan_validate_requirement() from public, anon, authenticated;

comment on table public.planner_plans is 'Canonical M11.3A Plan container. Legacy planner_goals remains a compatibility source.';
comment on column public.planner_plans.archived_at is 'Orthogonal archive property; valid only for completed/closed Plans.';
comment on column public.planner_plan_requirements.external_entity_id is 'Reserved for Integration-owned Task/Event binding; must remain NULL in M11.3A.';
comment on table public.planner_plan_operations is 'Private personal-Plan replay and audit evidence only. Household replay uses canonical planner_idempotency_keys and audit_events.';

commit;
