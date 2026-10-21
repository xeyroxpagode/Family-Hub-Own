-- Planner closure (overnight): Task<->Plan link closure.
-- Corrective / additive only. Does NOT edit any already-applied migration.
-- 1. mutate_planner_task_v0: accepts plan_classification on create/update,
--    defaults link classification to 'necessary', and gates structural link
--    changes (link/unlink/reclassify) on Plan edit authority + editable
--    lifecycle (preparation/active/paused). New outcomes: plan_locked (409),
--    invalid_plan_classification (400).
-- 2. planner_component_plan_link_guard: deterministic default ('necessary')
--    when a linked row carries no classification (approved repair for writers
--    that only know goal_id, e.g. responsibility materialization); preserves
--    same-household / not-trashed / shape invariants.

create or replace function public.mutate_planner_task_v0(
  p_household_id uuid,
  p_task_id uuid,
  p_action text,
  p_expected_version integer,
  p_payload jsonb,
  p_request_id text,
  p_mutation_id text,
  p_idempotency_key text,
  p_operation text,
  p_payload_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_task public.planner_tasks%rowtype;
  v_before public.planner_tasks%rowtype;
  v_response jsonb;
  v_reservation jsonb;
  v_idempotency_error text;
  v_actor_account uuid := auth.uid();
  v_actor_person uuid := public.current_person_id();
  v_actor_member uuid := public.current_household_member_id(p_household_id);
  v_title text;
  v_next_status text;
  v_audit uuid;
  v_goal_id uuid;
  v_classification text;
  v_plan public.planner_goals%rowtype;
  v_link_changed boolean := false;
  v_plan_owner boolean;
  v_plan_cap text;
  v_assigned_member_id uuid;
  v_origin_entity_id uuid;
begin
  if p_payload is null then
    p_payload := '{}'::jsonb;
  end if;

  if p_action not in ('create','update','complete','verify','cancel','reactivate','trash','restore') then
    return jsonb_build_object('outcome', 'invalid_transition');
  end if;

  if v_actor_account is null or v_actor_person is null or v_actor_member is null then
    return jsonb_build_object('outcome', 'planner_forbidden');
  end if;

  if p_action <> 'create' and p_expected_version is null then
    return jsonb_build_object('outcome', 'expected_version_required');
  end if;

  if not public.planner_current_actor_has_capability(p_household_id, 'planner.view') then
    return jsonb_build_object('outcome', 'planner_forbidden');
  end if;

  if p_action = 'create' then
    if not public.planner_current_actor_has_capability(p_household_id, 'task.create_household') then
      return jsonb_build_object('outcome', 'planner_forbidden');
    end if;
  else
    select * into v_task
    from public.planner_tasks
    where id = p_task_id and household_id = p_household_id
    for update;

    if not found then
      return jsonb_build_object('outcome', 'not_found');
    end if;

    if p_action in ('update') and not public.planner_current_actor_has_capability(
      p_household_id,
      case when v_task.created_by_member_id = v_actor_member then 'task.edit_own' else 'task.edit_any' end
    ) then
      return jsonb_build_object('outcome', 'planner_forbidden');
    end if;

    if p_action in ('cancel','reactivate') and not public.planner_current_actor_has_capability(
      p_household_id,
      case when v_task.created_by_member_id = v_actor_member then 'task.cancel_own' else 'task.cancel_any' end
    ) then
      return jsonb_build_object('outcome', 'planner_forbidden');
    end if;

    if p_action in ('trash','restore') and not public.planner_current_actor_has_capability(p_household_id, 'task.restore') then
      return jsonb_build_object('outcome', 'planner_forbidden');
    end if;
  end if;

  v_idempotency_error := public.planner_task_v1_assert_payload_hash(
    p_operation, p_household_id, p_task_id, p_payload, p_expected_version, p_mutation_id, p_payload_hash
  );
  if p_idempotency_key is null or length(btrim(p_idempotency_key)) = 0 then
    return jsonb_build_object('outcome', 'idempotency_context_required');
  end if;
  if v_idempotency_error is not null then
    return jsonb_build_object('outcome', v_idempotency_error);
  end if;

  v_reservation := public.planner_v2_reserve_idempotency(
    v_actor_account, v_actor_person, 'household', p_household_id, p_operation,
    case when p_action = 'create' then 'CREATE_IDEMPOTENT' else 'VERSIONED_MUTATION' end,
    p_idempotency_key, p_mutation_id, p_payload_hash, 30
  );
  if v_reservation->>'outcome' = 'replay' then
    return coalesce(v_reservation->'response_body', '{}'::jsonb) || jsonb_build_object('outcome', 'replay');
  end if;

  if p_action = 'create' then
    v_title := nullif(btrim(coalesce(p_payload->>'title', '')), '');
    if v_title is null then
      v_response := jsonb_build_object('outcome', 'validation_error');
      return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 400, v_response, 'failed_stable');
    end if;

    if coalesce(p_payload->>'assigned_to_member_id', '') <> '' then
      v_assigned_member_id := (p_payload->>'assigned_to_member_id')::uuid;
      if not exists (
        select 1 from public.household_members hm
        where hm.id = v_assigned_member_id and hm.household_id = p_household_id and hm.status = 'active'
      ) then
        v_response := jsonb_build_object('outcome', 'validation_error');
        return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 400, v_response, 'failed_stable');
      end if;
    end if;

    if coalesce(p_payload->>'goal_id', '') <> '' then
      v_goal_id := (p_payload->>'goal_id')::uuid;
      if not exists (
        select 1 from public.planner_goals g
        where g.id = v_goal_id and g.household_id = p_household_id
          and g.deleted_at is null and g.trashed_at is null
      ) then
        v_response := jsonb_build_object('outcome', 'validation_error');
        return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 400, v_response, 'failed_stable');
      end if;
      -- Plan component link (Planner closure): classification defaults to
      -- Required ('necessary'); linking needs Plan edit authority and a
      -- structurally editable lifecycle. Same-household + not-trashed are
      -- enforced by the existence check above.
      v_classification := nullif(btrim(coalesce(p_payload->>'plan_classification', '')), '');
      if v_classification is null then v_classification := 'necessary'; end if;
      if v_classification not in ('necessary', 'supporting') then
        v_response := jsonb_build_object('outcome', 'invalid_plan_classification');
        return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 400, v_response, 'failed_stable');
      end if;
      select * into v_plan from public.planner_goals where id = v_goal_id;
      if v_plan.lifecycle not in ('preparation', 'active', 'paused') then
        v_response := jsonb_build_object('outcome', 'plan_locked');
        return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 409, v_response, 'failed_stable');
      end if;
      v_plan_owner := (v_plan.created_by_member_id = v_actor_member);
      v_plan_cap := case when v_plan_owner then 'goal.edit_own' else 'goal.edit_any' end;
      if not public.planner_current_actor_has_capability(p_household_id, v_plan_cap) then
        v_response := jsonb_build_object('outcome', 'planner_forbidden');
        return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 403, v_response, 'failed_stable');
      end if;
    elsif coalesce(p_payload->>'plan_classification', '') <> '' then
      v_response := jsonb_build_object('outcome', 'invalid_plan_classification');
      return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 400, v_response, 'failed_stable');
    end if;

    if coalesce(p_payload->>'origin_entity_id', '') <> '' then
      v_origin_entity_id := (p_payload->>'origin_entity_id')::uuid;
    end if;

    insert into public.planner_tasks(
      household_id, title, description, priority, template_key, category,
      due_date, due_time, requires_verification,
      created_by_member_id, created_by_person_id, assigned_to_member_id,
      goal_id, plan_classification, origin_module, origin_entity_type, origin_entity_id, origin_reason
    ) values (
      p_household_id,
      v_title,
      nullif(btrim(coalesce(p_payload->>'description', '')), ''),
      coalesce(nullif(p_payload->>'priority', ''), 'normal'),
      nullif(p_payload->>'template_key', ''),
      nullif(btrim(coalesce(p_payload->>'category', '')), ''),
      nullif(p_payload->>'due_date', '')::date,
      nullif(p_payload->>'due_time', '')::time,
      coalesce((p_payload->>'requires_verification')::boolean, false),
      v_actor_member,
      v_actor_person,
      v_assigned_member_id,
      v_goal_id,
      v_classification,
      nullif(p_payload->>'origin_module', ''),
      nullif(btrim(coalesce(p_payload->>'origin_entity_type', '')), ''),
      v_origin_entity_id,
      nullif(btrim(coalesce(p_payload->>'origin_reason', '')), '')
    )
    returning * into v_task;

    v_audit := public.planner_v2_append_audit(
      v_actor_account, v_actor_person, 'household', p_household_id,
      'planner', 'task.created', 'task', v_task.id, 'succeeded',
      v_actor_member, p_request_id, p_mutation_id,
      jsonb_build_object('task_id', v_task.id, 'operation_id', p_mutation_id)
    );
    v_response := jsonb_build_object('outcome', 'created', 'task', to_jsonb(v_task), 'audit_event_id', v_audit);
    return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 201, v_response, 'completed');
  end if;

  if v_task.version <> p_expected_version then
    v_response := jsonb_build_object('outcome', 'version_conflict', 'current_version', v_task.version);
    return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 412, v_response, 'failed_stable');
  end if;

  v_before := v_task;

  if p_action = 'update' and p_payload = '{}'::jsonb then
    v_response := jsonb_build_object('outcome', 'noop', 'task', to_jsonb(v_task));
    return public.planner_task_v1_complete_idempotency(
      v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 200, v_response, 'completed'
    );
  end if;

  if p_action = 'update' then
    if coalesce(p_payload->>'assigned_to_member_id', '') <> '' then
      v_assigned_member_id := (p_payload->>'assigned_to_member_id')::uuid;
      if not exists (
        select 1 from public.household_members hm
        where hm.id = v_assigned_member_id and hm.household_id = p_household_id and hm.status = 'active'
      ) then
        v_response := jsonb_build_object('outcome', 'validation_error');
        return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 400, v_response, 'failed_stable');
      end if;
    end if;

    if p_payload ? 'goal_id' then
      if coalesce(p_payload->>'goal_id', '') <> '' then
        v_goal_id := (p_payload->>'goal_id')::uuid;
        if not exists (
          select 1 from public.planner_goals g
          where g.id = v_goal_id and g.household_id = p_household_id
            and g.deleted_at is null and g.trashed_at is null
        ) then
          v_response := jsonb_build_object('outcome', 'validation_error');
          return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 400, v_response, 'failed_stable');
        end if;
      else
        v_goal_id := null;
      end if;
    else
      v_goal_id := v_task.goal_id;
    end if;
    if p_payload ? 'plan_classification' then
      v_classification := nullif(btrim(coalesce(p_payload->>'plan_classification', '')), '');
    elsif p_payload ? 'goal_id' then
      v_classification := case when v_goal_id is null then null else coalesce(v_task.plan_classification, 'necessary') end;
    else
      v_classification := v_task.plan_classification;
    end if;
    if (v_goal_id is null and v_classification is not null)
      or (v_goal_id is not null and coalesce(v_classification, '') not in ('necessary', 'supporting')) then
      v_response := jsonb_build_object('outcome', 'invalid_plan_classification');
      return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 400, v_response, 'failed_stable');
    end if;
    v_link_changed := (v_goal_id is distinct from v_task.goal_id)
      or (v_classification is distinct from v_task.plan_classification);
    if v_link_changed then
      if v_goal_id is not null then
        select * into v_plan from public.planner_goals where id = v_goal_id;
        if v_plan.lifecycle not in ('preparation', 'active', 'paused') then
          v_response := jsonb_build_object('outcome', 'plan_locked');
          return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 409, v_response, 'failed_stable');
        end if;
        v_plan_owner := (v_plan.created_by_member_id = v_actor_member);
        v_plan_cap := case when v_plan_owner then 'goal.edit_own' else 'goal.edit_any' end;
        if not public.planner_current_actor_has_capability(p_household_id, v_plan_cap) then
          v_response := jsonb_build_object('outcome', 'planner_forbidden');
          return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 403, v_response, 'failed_stable');
        end if;
      end if;
      if v_task.goal_id is not null and v_task.goal_id is distinct from v_goal_id then
        select * into v_plan from public.planner_goals where id = v_task.goal_id;
        if found then
          if v_plan.trashed_at is not null or v_plan.lifecycle not in ('preparation', 'active', 'paused') then
            v_response := jsonb_build_object('outcome', 'plan_locked');
            return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 409, v_response, 'failed_stable');
          end if;
          v_plan_owner := (v_plan.created_by_member_id = v_actor_member);
          v_plan_cap := case when v_plan_owner then 'goal.edit_own' else 'goal.edit_any' end;
          if not public.planner_current_actor_has_capability(p_household_id, v_plan_cap) then
            v_response := jsonb_build_object('outcome', 'planner_forbidden');
            return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 403, v_response, 'failed_stable');
          end if;
        end if;
      end if;
    end if;

    update public.planner_tasks
    set title = case when p_payload ? 'title' then p_payload->>'title' else title end,
        description = case when p_payload ? 'description' then nullif(btrim(coalesce(p_payload->>'description', '')), '') else description end,
        priority = case when p_payload ? 'priority' then p_payload->>'priority' else priority end,
        template_key = case when p_payload ? 'template_key' then nullif(p_payload->>'template_key', '') else template_key end,
        category = case when p_payload ? 'category' then nullif(btrim(coalesce(p_payload->>'category', '')), '') else category end,
        due_date = case when p_payload ? 'due_date' then nullif(p_payload->>'due_date', '')::date else due_date end,
        due_time = case when p_payload ? 'due_time' then nullif(p_payload->>'due_time', '')::time else due_time end,
        assigned_to_member_id = case when p_payload ? 'assigned_to_member_id' then v_assigned_member_id else assigned_to_member_id end,
        requires_verification = case when p_payload ? 'requires_verification' then coalesce((p_payload->>'requires_verification')::boolean, false) else requires_verification end,
        goal_id = case when p_payload ? 'goal_id' then v_goal_id else goal_id end,
        plan_classification = case when (p_payload ? 'goal_id' or p_payload ? 'plan_classification') then v_classification else plan_classification end
    where id = p_task_id and household_id = p_household_id
    returning * into v_task;

    if to_jsonb(v_before) = to_jsonb(v_task) then
      v_response := jsonb_build_object('outcome', 'noop', 'task', to_jsonb(v_task));
      return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 200, v_response, 'completed');
    end if;

    v_audit := public.planner_v2_append_audit(
      v_actor_account, v_actor_person, 'household', p_household_id,
      'planner', 'task.updated', 'task', p_task_id, 'succeeded',
      v_actor_member, p_request_id, p_mutation_id,
      jsonb_build_object('task_id', p_task_id, 'operation_id', p_mutation_id)
    );
    v_response := jsonb_build_object('outcome', 'updated', 'task', to_jsonb(v_task), 'audit_event_id', v_audit);
    return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 200, v_response, 'completed');
  elsif p_action = 'complete' then
    if v_task.trashed_at is not null or v_task.status = 'cancelled' then
      v_response := jsonb_build_object('outcome', 'task_not_operational');
      return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 409, v_response, 'failed_stable');
    end if;
    v_response := public.complete_planner_task_with_audit(
      p_household_id, p_task_id, p_expected_version, v_actor_member, v_actor_account,
      p_request_id, p_mutation_id
    );
    if v_response->>'outcome' in ('version_conflict','not_found','invalid_state','forbidden') then
      return public.planner_task_v1_complete_idempotency(
        v_reservation, p_mutation_id, p_payload_hash, v_actor_account,
        case when v_response->>'outcome' = 'version_conflict' then 412 when v_response->>'outcome' = 'not_found' then 404 when v_response->>'outcome' = 'forbidden' then 403 else 409 end,
        v_response,
        'failed_stable'
      );
    end if;
    return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 200, v_response, 'completed');
  elsif p_action = 'verify' then
    if v_task.trashed_at is not null or v_task.status = 'cancelled' then
      v_response := jsonb_build_object('outcome', 'task_not_operational');
      return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 409, v_response, 'failed_stable');
    end if;
    v_response := public.verify_planner_task_fulfillment_with_audit(
      p_household_id, p_task_id, p_expected_version, p_request_id, p_mutation_id
    );
    if v_response->>'outcome' in ('version_conflict','invalid_state','self_verification') then
      return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, case when v_response->>'outcome' = 'version_conflict' then 412 else 409 end, v_response, 'failed_stable');
    end if;
    return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 200, v_response, 'completed');
  elsif p_action = 'cancel' then
    if v_task.status = 'cancelled' then
      v_response := jsonb_build_object('outcome', 'noop', 'task', to_jsonb(v_task));
      return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 200, v_response, 'completed');
    end if;
    update public.planner_tasks
    set status = 'cancelled',
        cancelled_at = now(),
        cancelled_by_member_id = v_actor_member,
        cancelled_reason = nullif(btrim(coalesce(p_payload->>'reason', '')), ''),
        cancelled_from_status = v_task.status
    where id = p_task_id and household_id = p_household_id
    returning * into v_task;
    v_audit := public.planner_v2_append_audit(v_actor_account, v_actor_person, 'household', p_household_id, 'planner', 'task.cancelled', 'task', p_task_id, 'succeeded', v_actor_member, p_request_id, p_mutation_id, jsonb_build_object('task_id', p_task_id, 'operation_id', p_mutation_id));
  elsif p_action = 'reactivate' then
    if v_task.trashed_at is not null then
      v_response := jsonb_build_object('outcome', 'task_in_trash');
      return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 409, v_response, 'failed_stable');
    end if;
    if v_task.status <> 'cancelled' then
      v_response := jsonb_build_object('outcome', 'noop', 'task', to_jsonb(v_task));
      return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 200, v_response, 'completed');
    end if;
    v_next_status := case when v_task.cancelled_from_status is not null and v_task.cancelled_from_status <> 'cancelled' then v_task.cancelled_from_status else 'pending' end;
    update public.planner_tasks
    set status = v_next_status,
        cancelled_at = null,
        cancelled_by_member_id = null,
        cancelled_reason = null,
        cancelled_from_status = null
    where id = p_task_id and household_id = p_household_id
    returning * into v_task;
    v_audit := public.planner_v2_append_audit(v_actor_account, v_actor_person, 'household', p_household_id, 'planner', 'task.reactivated', 'task', p_task_id, 'succeeded', v_actor_member, p_request_id, p_mutation_id, jsonb_build_object('task_id', p_task_id, 'operation_id', p_mutation_id));
  elsif p_action = 'trash' then
    if v_task.trashed_at is not null then
      v_response := jsonb_build_object('outcome', 'noop', 'task', to_jsonb(v_task));
      return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 200, v_response, 'completed');
    end if;
    update public.planner_tasks
    set trashed_at = now(),
        trashed_by_member_id = v_actor_member
    where id = p_task_id and household_id = p_household_id
    returning * into v_task;
    v_audit := public.planner_v2_append_audit(v_actor_account, v_actor_person, 'household', p_household_id, 'planner', 'task.trashed', 'task', p_task_id, 'succeeded', v_actor_member, p_request_id, p_mutation_id, jsonb_build_object('task_id', p_task_id, 'operation_id', p_mutation_id));
  elsif p_action = 'restore' then
    if v_task.trashed_at is null then
      v_response := jsonb_build_object('outcome', 'noop', 'task', to_jsonb(v_task));
      return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 200, v_response, 'completed');
    end if;
    update public.planner_tasks
    set trashed_at = null,
        trashed_by_member_id = null
    where id = p_task_id and household_id = p_household_id
    returning * into v_task;
    v_audit := public.planner_v2_append_audit(v_actor_account, v_actor_person, 'household', p_household_id, 'planner', 'task.restored', 'task', p_task_id, 'succeeded', v_actor_member, p_request_id, p_mutation_id, jsonb_build_object('task_id', p_task_id, 'operation_id', p_mutation_id));
  end if;

  v_response := jsonb_build_object('outcome', 'updated', 'task', to_jsonb(v_task), 'audit_event_id', v_audit);
  return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 200, v_response, 'completed');
end;
$$;

create or replace function public.planner_component_plan_link_guard() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_household uuid; v_trashed timestamptz;
begin
 if new.goal_id is null then
  if new.plan_classification is not null then raise exception 'Plan classification requires a linked Plan' using errcode='23514'; end if;
  return new;
 end if;
 if new.plan_classification is null then new.plan_classification := 'necessary'; end if;
 select household_id,trashed_at into v_household,v_trashed from public.planner_goals where id=new.goal_id;
 if v_household is null or v_household<>new.household_id then raise exception 'Plan component must belong to the same household' using errcode='23514'; end if;
 if v_trashed is not null then raise exception 'Cannot link a trashed Plan' using errcode='23514'; end if;
 if new.plan_classification not in ('necessary','supporting') then raise exception 'Plan classification is required' using errcode='23514'; end if;
 return new;
end $$;
