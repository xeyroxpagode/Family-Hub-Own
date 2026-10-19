-- Keep the table-level authority aligned with the Series recurrence contract.
alter table public.planner_event_series drop constraint if exists planner_event_series_rule_object_check;
alter table public.planner_event_series add constraint planner_event_series_rule_object_check
  check (public.planner_event_series_rule_v1_is_valid(recurrence_rule));
