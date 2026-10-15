-- The base Event recurrence validator predates weekly multi-day Series and
-- rejects its extra key.  Validate the shared subset, then the Series key.
create or replace function public.planner_event_series_rule_v1_is_valid(p_rule jsonb)
returns boolean language sql stable as $$
  select public.planner_event_recurrence_rule_is_valid(p_rule - 'daysOfWeek')
    and (not (p_rule ? 'daysOfWeek') or (
      p_rule ->> 'frequency' = 'weekly'
      and jsonb_typeof(p_rule -> 'daysOfWeek') = 'array'
      and jsonb_array_length(p_rule -> 'daysOfWeek') between 1 and 7
      and not exists (select 1 from jsonb_array_elements_text(p_rule -> 'daysOfWeek') v where v !~ '^[0-6]$')
      and (select count(*) = count(distinct value) from jsonb_array_elements_text(p_rule -> 'daysOfWeek'))
    ));
$$;
