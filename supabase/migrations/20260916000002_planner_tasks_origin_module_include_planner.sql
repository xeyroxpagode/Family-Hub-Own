-- P2.1 integration fix: allow planner-owned origin module on planner_tasks.
--
-- materialize_planner_responsibility_v1 (20260916000001) writes origin_module
-- 'planner' with origin_entity_type 'responsibility'. The pre-existing check
-- constraint planner_tasks_origin_module_check (202607080003, additive audit
-- trail for external producer modules) only allowed
-- inventory/assets/finance/geni/automation, so every read-trigger
-- materialization failed with 23514.
--
-- Physical definition inspected before this migration:
--   CHECK (((origin_module IS NULL) OR (origin_module = ANY
--     (ARRAY['inventory'::text,'assets'::text,'finance'::text,'geni'::text,'automation'::text]))))
-- The new definition preserves all existing values and adds 'planner'.

alter table public.planner_tasks
  drop constraint if exists planner_tasks_origin_module_check;

alter table public.planner_tasks
  add constraint planner_tasks_origin_module_check
  check (
    origin_module is null
    or origin_module in (
      'inventory',
      'assets',
      'finance',
      'geni',
      'automation',
      'planner'
    )
  );
