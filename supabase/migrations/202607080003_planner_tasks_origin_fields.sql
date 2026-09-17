-- Planner tasks: add origin_* fields for Inventory/Assets/Finance/Geni/Automation audit trail.

alter table public.planner_tasks
  add column if not exists origin_module text null;

alter table public.planner_tasks
  add column if not exists origin_entity_type text null;

alter table public.planner_tasks
  add column if not exists origin_entity_id uuid null;

alter table public.planner_tasks
  add column if not exists origin_reason text null;

alter table public.planner_tasks
  drop constraint if exists planner_tasks_origin_module_check;
alter table public.planner_tasks
  add constraint planner_tasks_origin_module_check
  check (
    origin_module is null
    or origin_module in ('inventory', 'assets', 'finance', 'geni', 'automation')
  );

alter table public.planner_tasks
  drop constraint if exists planner_tasks_origin_entity_type_not_empty_check;
alter table public.planner_tasks
  add constraint planner_tasks_origin_entity_type_not_empty_check
  check (
    origin_entity_type is null
    or length(trim(origin_entity_type)) > 0
  );

alter table public.planner_tasks
  drop constraint if exists planner_tasks_origin_reason_not_empty_check;
alter table public.planner_tasks
  add constraint planner_tasks_origin_reason_not_empty_check
  check (
    origin_reason is null
    or length(trim(origin_reason)) > 0
  );

create index if not exists idx_planner_tasks_origin
  on public.planner_tasks (household_id, origin_module, origin_entity_type, origin_entity_id)
  where status != 'cancelled' and origin_module is not null;

create index if not exists idx_planner_tasks_origin_active
  on public.planner_tasks (household_id, origin_module, origin_entity_type, origin_entity_id, origin_reason, status)
  where origin_module is not null
    and origin_entity_type is not null
    and origin_entity_id is not null
    and status in ('pending', 'awaiting_verification');