-- Event Series materialization: enforce the bounded request SERVER-SIDE.
--
-- Gap closed (Planner V1 release verification, 2026-10-05):
-- `materialize_planner_event_series_range_v1` validated only `p_from`/`p_to`
-- ordering. The bound lived exclusively in the client
-- (`PlannerSeriesScreen` rejects `days > 180`), so the RPC itself accepted an
-- unbounded window and walked `generate_series` day-by-day for every active
-- Series in the household. A single crafted request (e.g. 1900..2999) turned
-- one bounded "materialize this window" action into an unbounded write loop.
--
-- Authority decision: the server is the authority, and it enforces exactly the
-- range the current client contract already supports — `1..180` days, i.e.
-- `(p_to - p_from) <= 180`. This is deliberately NOT a broader invented limit:
-- every request the shipping client can emit stays valid, and nothing wider is
-- accepted.
--
-- Preserved on purpose:
--   * idempotency — untouched writer, still `on conflict do nothing`;
--   * `series_id + occurrence_key` uniqueness — untouched partial index;
--   * timezone/date semantics — untouched snapshot math;
--   * paused/trashed Series never materialize — `lifecycle='active'` unchanged.
--
-- The bound is REJECTED BEFORE any row is written, so an over-limit request
-- creates 0 occurrences. `detail` carries a stable machine marker and the
-- errcode stays `22023` (invalid parameter value), which the API layer maps to
-- a structured 400 and never to a raw SQLSTATE leak.
--
-- Additive and immutable-safe: no applied migration is edited. The current
-- body is re-read with `pg_get_functiondef` (same technique as
-- 20261004000004) so this file can never drift from the live definition, and it
-- FAILS LOUDLY if the anchor is not found instead of silently no-opping.
do $$
declare
  v_anchor constant text :=
    'if p_from is null or p_to is null or p_to < p_from then raise exception ''invalid materialization range'' using errcode=''22023''; end if;';
  v_bound constant text :=
    'if (p_to - p_from) > 180 then raise exception ''materialization range exceeds the supported maximum of 180 days'' using errcode=''22023'', detail=''event_series_range_too_large''; end if;';
  v_definition text;
begin
  select pg_get_functiondef('public.materialize_planner_event_series_range_v1(uuid,date,date)'::regprocedure)
    into v_definition;

  if v_definition is null then
    raise exception 'materialize_planner_event_series_range_v1(uuid,date,date) is missing';
  end if;

  -- Idempotent re-application: a second run must not stack a second guard.
  if position(v_bound in v_definition) > 0 then
    return;
  end if;

  if position(v_anchor in v_definition) = 0 then
    raise exception 'anchor not found in materialize_planner_event_series_range_v1; refusing to guess';
  end if;

  execute replace(v_definition, v_anchor, v_anchor || chr(10) || '  ' || v_bound);
end;
$$;

-- The client contract is the source of the number; keep the shared bound
-- readable from SQL without widening it.
comment on function public.materialize_planner_event_series_range_v1(uuid, date, date)
  is 'Materializes active Planner Event Series into planner_events for [p_from, p_to]. Server authority: (p_to - p_from) must be <= 180 days, matching the supported client contract. Idempotent via series_id + occurrence_key.';