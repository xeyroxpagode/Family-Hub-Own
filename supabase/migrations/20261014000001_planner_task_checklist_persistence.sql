-- Patch 1: persist the canonical checklist JSON in the existing Task writer.
-- This is intentionally forward-only: historical migrations remain unchanged,
-- and the currently installed definition (including later Plan-link hardening)
-- is amended in place. Exact guards make drift fail loudly instead of silently
-- replacing an unexpected RPC body.

do $migration$
declare
  v_signature regprocedure := to_regprocedure(
    'public.mutate_planner_task_v0(uuid,uuid,text,integer,jsonb,text,text,text,text,text)'
  );
  v_definition text;
  v_create_columns text := $needle$
      due_date, due_time, requires_verification,
      created_by_member_id, created_by_person_id, assigned_to_member_id,
$needle$;
  v_create_columns_with_checklist text := $replacement$
      due_date, due_time, requires_verification, checklist,
      created_by_member_id, created_by_person_id, assigned_to_member_id,
$replacement$;
  v_create_values text := $needle$
      coalesce((p_payload->>'requires_verification')::boolean, false),
      v_actor_member,
$needle$;
  v_create_values_with_checklist text := $replacement$
      coalesce((p_payload->>'requires_verification')::boolean, false),
      case when p_payload ? 'checklist' then p_payload->'checklist' else '[]'::jsonb end,
      v_actor_member,
$replacement$;
  v_update_assignment text := $needle$
        assigned_to_member_id = case when p_payload ? 'assigned_to_member_id' then v_assigned_member_id else assigned_to_member_id end,
        requires_verification = case when p_payload ? 'requires_verification' then coalesce((p_payload->>'requires_verification')::boolean, false) else requires_verification end,
$needle$;
  v_update_assignment_with_checklist text := $replacement$
        assigned_to_member_id = case when p_payload ? 'assigned_to_member_id' then v_assigned_member_id else assigned_to_member_id end,
        requires_verification = case when p_payload ? 'requires_verification' then coalesce((p_payload->>'requires_verification')::boolean, false) else requires_verification end,
        checklist = case when p_payload ? 'checklist' then p_payload->'checklist' else checklist end,
$replacement$;
begin
  if v_signature is null then
    raise exception 'mutate_planner_task_v0 signature not found';
  end if;

  select pg_get_functiondef(v_signature) into v_definition;
  if position(v_create_columns in v_definition) = 0
     or position(v_create_values in v_definition) = 0
     or position(v_update_assignment in v_definition) = 0 then
    raise exception 'mutate_planner_task_v0 definition drifted; checklist patch not applied';
  end if;

  v_definition := replace(v_definition, v_create_columns, v_create_columns_with_checklist);
  v_definition := replace(v_definition, v_create_values, v_create_values_with_checklist);
  v_definition := replace(v_definition, v_update_assignment, v_update_assignment_with_checklist);
  execute v_definition;
end
$migration$;

comment on function public.mutate_planner_task_v0(uuid, uuid, text, integer, jsonb, text, text, text, text, text)
is 'Canonical idempotent V0 task mutation wrapper; create/update persist complete checklist arrays.';
