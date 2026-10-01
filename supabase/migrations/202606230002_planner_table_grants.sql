-- Planner table grants for authenticated PostgREST access.
-- RLS policies still enforce household isolation.

grant select, insert, update, delete on public.planner_tasks to authenticated;
grant select, insert, update, delete on public.planner_events to authenticated;
