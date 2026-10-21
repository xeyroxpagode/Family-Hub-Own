-- The existing uniqueness guard is a partial index, so retain it for
-- concurrent idempotency while using targetless ON CONFLICT in the writer.
do $$
declare v_definition text;
begin
  select pg_get_functiondef('public.materialize_planner_event_series_range_v1(uuid,date,date)'::regprocedure) into v_definition;
  v_definition := replace(v_definition, 'on conflict (series_id,occurrence_key) do nothing', 'on conflict do nothing');
  execute v_definition;
end;
$$;
