-- Planner P2.1: canonical recurring household responsibilities.
-- Additive only. A Responsibility is a rule; every execution remains a planner_task.
begin;

create table if not exists public.planner_responsibilities (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  description text null,
  lifecycle text not null default 'active' check (lifecycle in ('active','paused','archived','trashed')),
  assignment_kind text not null check (assignment_kind in ('fixed','rotation','claimable','unassigned')),
  schedule_kind text not null check (schedule_kind in ('daily','weekdays','interval','monthly','after_completion')),
  schedule_interval integer not null default 1 check (schedule_interval between 1 and 999),
  schedule_unit text null check (schedule_unit is null or schedule_unit in ('days','weeks','months')),
  weekdays smallint[] not null default '{}',
  month_day smallint null check (month_day between 1 and 31),
  anchor_date date not null,
  due_time time null,
  task_defaults jsonb not null default '{}'::jsonb check (jsonb_typeof(task_defaults) = 'object'),
  next_sequence bigint not null default 1 check (next_sequence > 0),
  requires_adjustment_reason text null,
  created_by_member_id uuid not null references public.household_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paused_at timestamptz null,
  archived_at timestamptz null,
  trashed_at timestamptz null,
  version integer not null default 1 check (version > 0),
  constraint planner_responsibility_schedule_shape check (
    (schedule_kind = 'daily' and schedule_unit is null and cardinality(weekdays) = 0 and month_day is null)
    or (schedule_kind = 'weekdays' and schedule_unit is null and cardinality(weekdays) > 0 and weekdays <@ array[0,1,2,3,4,5,6]::smallint[] and month_day is null)
    or (schedule_kind = 'interval' and schedule_unit is not null and cardinality(weekdays) = 0 and month_day is null)
    or (schedule_kind = 'monthly' and schedule_unit is null and cardinality(weekdays) = 0 and month_day is not null)
    or (schedule_kind = 'after_completion' and schedule_unit is not null and cardinality(weekdays) = 0 and month_day is null)
  )
);

create table if not exists public.planner_responsibility_members (
  responsibility_id uuid not null references public.planner_responsibilities(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  member_id uuid not null references public.household_members(id),
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  primary key (responsibility_id, member_id),
  unique (responsibility_id, position)
);

create table if not exists public.planner_responsibility_occurrences (
  id uuid primary key default gen_random_uuid(),
  responsibility_id uuid not null references public.planner_responsibilities(id) on delete restrict,
  household_id uuid not null references public.households(id) on delete cascade,
  sequence bigint not null check (sequence > 0),
  occurrence_key text not null,
  scheduled_date date not null,
  rotation_slot_member_id uuid null references public.household_members(id) on delete set null,
  task_id uuid not null references public.planner_tasks(id) on delete restrict,
  resolved_at timestamptz null,
  resolution_status text null check (resolution_status is null or resolution_status in ('completed','verified')),
  created_at timestamptz not null default now(),
  unique (responsibility_id, sequence),
  unique (responsibility_id, occurrence_key),
  unique (task_id)
);

create unique index if not exists planner_responsibility_one_live_occurrence
  on public.planner_responsibility_occurrences(responsibility_id)
  where resolved_at is null;
create index if not exists planner_responsibilities_household_lifecycle
  on public.planner_responsibilities(household_id, lifecycle, updated_at desc);
create index if not exists planner_responsibility_occurrences_history
  on public.planner_responsibility_occurrences(responsibility_id, sequence desc);

alter table public.planner_tasks
  add column if not exists responsibility_id uuid null references public.planner_responsibilities(id) on delete restrict,
  add column if not exists responsibility_occurrence_sequence bigint null;

alter table public.planner_tasks drop constraint if exists planner_tasks_responsibility_origin_shape;
alter table public.planner_tasks add constraint planner_tasks_responsibility_origin_shape check (
  (responsibility_id is null and responsibility_occurrence_sequence is null)
  or (responsibility_id is not null and responsibility_occurrence_sequence is not null and responsibility_occurrence_sequence > 0)
);
create unique index if not exists planner_tasks_responsibility_occurrence_unique
  on public.planner_tasks(responsibility_id, responsibility_occurrence_sequence)
  where responsibility_id is not null;

create or replace function public.planner_responsibility_touch_version()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.version := old.version + 1;
  return new;
end $$;
drop trigger if exists planner_responsibility_touch_version on public.planner_responsibilities;
create trigger planner_responsibility_touch_version before update on public.planner_responsibilities
for each row execute function public.planner_responsibility_touch_version();

alter table public.planner_responsibilities enable row level security;
alter table public.planner_responsibility_members enable row level security;
alter table public.planner_responsibility_occurrences enable row level security;

grant select, insert, update on public.planner_responsibilities to authenticated;
grant select, insert, update, delete on public.planner_responsibility_members to authenticated;
grant select, insert, update on public.planner_responsibility_occurrences to authenticated;
grant all on public.planner_responsibilities, public.planner_responsibility_members, public.planner_responsibility_occurrences to service_role;

create policy planner_responsibilities_select on public.planner_responsibilities for select to authenticated
  using (public.is_active_household_member(household_id) and public.planner_current_actor_has_capability(household_id, 'planner.view'));
create policy planner_responsibilities_insert on public.planner_responsibilities for insert to authenticated
  with check (public.is_active_household_member(household_id) and created_by_member_id = public.current_household_member_id(household_id));
create policy planner_responsibilities_update on public.planner_responsibilities for update to authenticated
  using (public.is_active_household_member(household_id)) with check (public.is_active_household_member(household_id));

create policy planner_responsibility_members_select on public.planner_responsibility_members for select to authenticated
  using (public.is_active_household_member(household_id));
create policy planner_responsibility_members_insert on public.planner_responsibility_members for insert to authenticated
  with check (public.is_active_household_member(household_id));
create policy planner_responsibility_members_update on public.planner_responsibility_members for update to authenticated
  using (public.is_active_household_member(household_id)) with check (public.is_active_household_member(household_id));
create policy planner_responsibility_members_delete on public.planner_responsibility_members for delete to authenticated
  using (public.is_active_household_member(household_id));

create policy planner_responsibility_occurrences_select on public.planner_responsibility_occurrences for select to authenticated
  using (public.is_active_household_member(household_id));
create policy planner_responsibility_occurrences_insert on public.planner_responsibility_occurrences for insert to authenticated
  with check (public.is_active_household_member(household_id));
create policy planner_responsibility_occurrences_update on public.planner_responsibility_occurrences for update to authenticated
  using (public.is_active_household_member(household_id)) with check (public.is_active_household_member(household_id));

-- Atomic materialization boundary. The backend computes the next local-calendar
-- slot, while this function owns locking, idempotency, canonical Task creation,
-- assignment/fulfillment projection, ledger insertion and sequence advance.
create or replace function public.materialize_planner_responsibility_v1(
  p_household_id uuid,
  p_responsibility_id uuid,
  p_sequence bigint,
  p_occurrence_key text,
  p_scheduled_date date,
  p_assignment_kind text,
  p_member_ids uuid[] default '{}',
  p_rotation_slot_member_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_rule public.planner_responsibilities%rowtype;
  v_task public.planner_tasks%rowtype;
  v_defaults jsonb;
  v_member uuid;
begin
  if not public.is_active_household_member(p_household_id)
    or not public.planner_current_actor_has_capability(p_household_id, 'task.create_household') then
    return jsonb_build_object('outcome','forbidden');
  end if;
  select * into v_rule from public.planner_responsibilities
  where id = p_responsibility_id and household_id = p_household_id for update;
  if not found then return jsonb_build_object('outcome','not_found'); end if;
  if v_rule.lifecycle <> 'active' or v_rule.requires_adjustment_reason is not null then
    return jsonb_build_object('outcome','not_eligible');
  end if;
  if exists (select 1 from public.planner_responsibility_occurrences where responsibility_id = v_rule.id and resolved_at is null) then
    return jsonb_build_object('outcome','live_exists');
  end if;
  if v_rule.next_sequence <> p_sequence then
    return jsonb_build_object('outcome','sequence_conflict','current_sequence',v_rule.next_sequence);
  end if;
  if p_assignment_kind not in ('anyone','members','legacy_unassigned') then
    raise exception 'invalid assignment kind' using errcode='22023';
  end if;
  if p_assignment_kind = 'members' and cardinality(p_member_ids) = 0 then
    raise exception 'members assignment requires members' using errcode='22023';
  end if;
  if exists (
    select 1 from unnest(p_member_ids) chosen
    left join public.household_members hm on hm.id = chosen and hm.household_id = p_household_id and hm.status = 'active'
    where hm.id is null
  ) then raise exception 'ineligible responsibility member' using errcode='23514'; end if;

  v_defaults := v_rule.task_defaults;
  insert into public.planner_tasks(
    household_id,title,description,priority,template_key,due_date,due_time,
    estimated_duration_minutes,checklist,requires_verification,goal_id,
    created_by_member_id,created_by_person_id,assigned_to_member_id,
    origin_module,origin_entity_type,origin_entity_id,origin_reason,
    responsibility_id,responsibility_occurrence_sequence
  ) values (
    p_household_id,v_rule.title,v_rule.description,
    coalesce(v_defaults->>'priority','normal'),nullif(v_defaults->>'template_key',''),
    p_scheduled_date,v_rule.due_time,nullif(v_defaults->>'estimated_duration_minutes','')::integer,
    case when jsonb_typeof(v_defaults->'checklist')='array' then v_defaults->'checklist' else '[]'::jsonb end,
    coalesce((v_defaults->>'requires_verification')::boolean,false),nullif(v_defaults->>'goal_id','')::uuid,
    public.current_household_member_id(p_household_id),public.current_person_id(),
    case when p_assignment_kind='members' and cardinality(p_member_ids)=1 then p_member_ids[1] else null end,
    'planner','responsibility',v_rule.id,p_occurrence_key,v_rule.id,p_sequence
  ) returning * into v_task;

  -- The canonical insert trigger created a safe default shared_once projection.
  -- Replace it atomically for fixed groups and true unassigned Tasks.
  if not (p_assignment_kind='members' and cardinality(p_member_ids)=1) then
    delete from public.planner_task_fulfillments where task_id=v_task.id;
    delete from public.planner_task_assignees where task_id=v_task.id;
    update public.planner_task_assignment_configs
      set assignment_kind=p_assignment_kind, fulfillment_mode='shared_once', legacy_backfill=false
      where task_id=v_task.id;
    if p_assignment_kind='members' then
      foreach v_member in array p_member_ids loop
        insert into public.planner_task_assignees(task_id,household_id,member_id) values(v_task.id,p_household_id,v_member);
      end loop;
    end if;
    perform public.planner_create_current_task_fulfillments(v_task.id);
  end if;

  insert into public.planner_responsibility_occurrences(
    responsibility_id,household_id,sequence,occurrence_key,scheduled_date,
    rotation_slot_member_id,task_id
  ) values (v_rule.id,p_household_id,p_sequence,p_occurrence_key,p_scheduled_date,p_rotation_slot_member_id,v_task.id);
  update public.planner_responsibilities set next_sequence=next_sequence+1 where id=v_rule.id;
  return jsonb_build_object('outcome','created','task_id',v_task.id,'sequence',p_sequence);
exception when unique_violation then
  return jsonb_build_object('outcome','duplicate');
end $$;

grant execute on function public.materialize_planner_responsibility_v1(uuid,uuid,bigint,text,date,text,uuid[],uuid) to authenticated;
grant execute on function public.materialize_planner_responsibility_v1(uuid,uuid,bigint,text,date,text,uuid[],uuid) to service_role;

comment on table public.planner_responsibilities is 'P2.1 persistent recurring household rules. Runtime completion stays in planner_tasks.';
comment on table public.planner_responsibility_occurrences is 'P2.1 immutable occurrence ledger and DB-level one-live/idempotency guard.';
comment on column public.planner_responsibilities.task_defaults is 'Stable future-task defaults only; runtime Task state is forbidden.';

commit;
