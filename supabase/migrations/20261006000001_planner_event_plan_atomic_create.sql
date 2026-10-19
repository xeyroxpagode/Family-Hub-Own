-- Plans V1 Slice 2: atomic Event + Plan relation creation.
-- Additive only. The standalone create_planner_event_v1 contract is unchanged.

create or replace function public.create_planner_event_for_plan_v1(
  p_payload jsonb,
  p_goal_id uuid,
  p_plan_classification text default 'necessary',
  p_request_id text default null,
  p_mutation_id text default null,
  p_idempotency_key text default null,
  p_actor_account_id uuid default null,
  p_actor_person_id uuid default null,
  p_scope_id uuid default null,
  p_payload_hash text default null,
  p_operation text default 'planner.events.v1.create-for-plan'
) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_result jsonb;
  v_link jsonb;
  v_event public.planner_events%rowtype;
  v_event_id uuid;
begin
  if p_goal_id is null then
    raise exception 'goal_id is required' using errcode = '22023';
  end if;
  if coalesce(p_plan_classification, 'necessary') not in ('necessary', 'supporting') then
    raise exception 'invalid_plan_classification' using errcode = '22023';
  end if;

  v_result := public.create_planner_event_v1(
    p_payload, p_request_id, p_mutation_id, p_idempotency_key,
    p_actor_account_id, p_actor_person_id, 'household', p_scope_id,
    p_payload_hash, p_operation
  );
  v_event_id := coalesce(
    (v_result #>> '{data,event,id}')::uuid,
    (v_result #>> '{body,data,event,id}')::uuid,
    (v_result #>> '{event,id}')::uuid
  );
  select * into v_event from public.planner_events where id = v_event_id for update;

  -- Idempotent replay: the complete requested mutation already exists.
  if v_event.goal_id = p_goal_id
     and v_event.plan_classification = coalesce(p_plan_classification, 'necessary') then
    return jsonb_set(v_result, '{data,event}', to_jsonb(v_event), true);
  end if;
  if v_event.goal_id is not null then
    raise exception 'event relation conflicts with idempotent request' using errcode = 'P0008';
  end if;

  v_link := public.link_planner_event_to_plan(
    v_event_id, p_goal_id, coalesce(p_plan_classification, 'necessary'),
    v_event.version, p_scope_id
  );
  if coalesce((v_link->>'success')::boolean, false) is not true then
    raise exception 'event-plan create failed'
      using errcode = 'P0001', detail = coalesce(v_link->>'error', 'internal_error');
  end if;
  return jsonb_set(v_result, '{data,event}', v_link->'event', true);
end $$;

revoke all on function public.create_planner_event_for_plan_v1(
  jsonb, uuid, text, text, text, text, uuid, uuid, uuid, text, text
) from public, anon;
grant execute on function public.create_planner_event_for_plan_v1(
  jsonb, uuid, text, text, text, text, uuid, uuid, uuid, text, text
) to authenticated, service_role;
