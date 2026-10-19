-- Plans V1 Slice 3: Product lifecycle guard.
-- Preparation -> cancelled is not a canonical Product transition, including
-- for authenticated callers invoking the older transition RPC directly.

create or replace function public.guard_planner_plan_preparation_cancel_v1()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if old.lifecycle = 'preparation' and new.lifecycle = 'cancelled' then
    raise exception 'preparation cannot be cancelled'
      using errcode = '22023', detail = 'invalid_lifecycle_transition';
  end if;
  return new;
end $$;

drop trigger if exists planner_goals_preparation_cancel_guard_v1 on public.planner_goals;
create trigger planner_goals_preparation_cancel_guard_v1
before update of lifecycle on public.planner_goals
for each row execute function public.guard_planner_plan_preparation_cancel_v1();

revoke all on function public.guard_planner_plan_preparation_cancel_v1() from public, anon, authenticated;
