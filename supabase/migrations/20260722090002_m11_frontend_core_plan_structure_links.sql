-- M11 Frontend Core Integration R1
-- Owner: Integration
-- Scope: Plan Structure changeset RPC + stable Plan -> Task/Event link DTOs.

begin;

alter table public.planner_plan_requirements
  drop constraint if exists planner_plan_requirements_subject_shape;

alter table public.planner_plan_requirements
  add constraint planner_plan_requirements_subject_shape
  check (
    (subject_type = 'milestone' and milestone_id is not null and measurement_id is null and manual_condition_id is null and external_kind is null and external_reference_key is null and external_entity_id is null)
    or
    (subject_type = 'measurement' and milestone_id is null and measurement_id is not null and manual_condition_id is null and external_kind is null and external_reference_key is null and external_entity_id is null)
    or
    (subject_type = 'manual_condition' and milestone_id is null and measurement_id is null and manual_condition_id is not null and external_kind is null and external_reference_key is null and external_entity_id is null)
    or
    (subject_type = 'external' and milestone_id is null and measurement_id is null and manual_condition_id is null and external_kind is not null and external_reference_key is not null)
  );

create or replace function public.planner_plan_external_link_dto(
  p_plan public.planner_plans,
  p_requirement public.planner_plan_requirements
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_task public.planner_tasks%rowtype;
  v_event public.planner_events%rowtype;
  v_external_id uuid := coalesce(p_requirement.external_entity_id, p_requirement.external_reference_key);
begin
  if p_requirement.subject_type <> 'external' then
    return null;
  end if;

  if p_requirement.external_kind = 'task' then
    select * into v_task from public.planner_tasks where id = v_external_id;
    if not found then
      return jsonb_build_object(
        'entity_type', 'task',
        'external_entity_id', v_external_id,
        'availability', 'missing',
        'relation_kind', p_requirement.classification
      );
    end if;
    if p_plan.scope <> 'household' or v_task.household_id is distinct from p_plan.household_id then
      return jsonb_build_object(
        'entity_type', 'task',
        'external_entity_id', v_external_id,
        'availability', 'forbidden',
        'relation_kind', p_requirement.classification
      );
    end if;
    return jsonb_build_object(
      'entity_type', 'task',
      'external_entity_id', v_task.id,
      'plan_requirement_id', p_requirement.id,
      'title', v_task.title,
      'lifecycle', case when v_task.trashed_at is not null then 'trash' else v_task.status end,
      'relation_kind', p_requirement.classification,
      'availability', case when v_task.trashed_at is not null then 'trashed' else 'available' end
    );
  end if;

  if p_requirement.external_kind = 'event' then
    select * into v_event from public.planner_events where id = v_external_id;
    if not found then
      return jsonb_build_object(
        'entity_type', 'event',
        'external_entity_id', v_external_id,
        'availability', 'missing',
        'relation_kind', p_requirement.classification
      );
    end if;
    if not (
      (p_plan.scope = 'household' and v_event.scope = 'household' and v_event.household_id is not distinct from p_plan.household_id)
      or
      (p_plan.scope = 'personal' and v_event.scope = 'personal' and v_event.owner_person_id is not distinct from p_plan.owner_person_id)
    ) then
      return jsonb_build_object(
        'entity_type', 'event',
        'external_entity_id', v_external_id,
        'availability', 'forbidden',
        'relation_kind', p_requirement.classification
      );
    end if;
    return jsonb_build_object(
      'entity_type', 'event',
      'external_entity_id', v_event.id,
      'plan_requirement_id', p_requirement.id,
      'title', v_event.title,
      'lifecycle', v_event.lifecycle,
      'relation_kind', p_requirement.classification,
      'availability', case when v_event.lifecycle = 'trash' or v_event.trashed_at is not null then 'trashed' else 'available' end
    );
  end if;

  return jsonb_build_object(
    'entity_type', coalesce(p_requirement.external_kind, 'task'),
    'external_entity_id', v_external_id,
    'availability', 'stale',
    'relation_kind', p_requirement.classification
  );
end;
$$;

create or replace function public.read_planner_plan_graph_rpc(p_plan_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'plan', to_jsonb(p),
    'indicators', to_jsonb(i),
    'milestones', coalesce((select jsonb_agg(to_jsonb(m) order by m.sort_order,m.id) from public.planner_plan_milestones m where m.plan_id=p.id and m.trashed_at is null),'[]'::jsonb),
    'measurements', coalesce((select jsonb_agg(
      to_jsonb(x) || jsonb_build_object('history',coalesce((
        select jsonb_agg(to_jsonb(h) order by h.recorded_at,h.id)
        from public.planner_plan_measurement_history h where h.measurement_id=x.id
      ),'[]'::jsonb)) order by x.sort_order,x.id
    ) from public.planner_plan_measurements x where x.plan_id=p.id and x.trashed_at is null),'[]'::jsonb),
    'manualConditions', coalesce((select jsonb_agg(to_jsonb(c) order by c.sort_order,c.id) from public.planner_plan_manual_conditions c where c.plan_id=p.id and c.trashed_at is null),'[]'::jsonb),
    'requirements', coalesce((select jsonb_agg(
      to_jsonb(r)
      || jsonb_build_object(
        'satisfied', public.planner_plan_requirement_satisfied(r.id),
        'linked_entity', public.planner_plan_external_link_dto(p, r)
      )
      order by r.parent_requirement_id nulls first,r.sort_order,r.id
    ) from public.planner_plan_requirements r where r.plan_id=p.id and r.trashed_at is null),'[]'::jsonb),
    'draftIsolation', jsonb_build_object(
      'contained', p.lifecycle='draft',
      'operationalChildrenPublished', false,
      'appearsInHome', false,
      'notifies', false,
      'recurs', false
    )
  )
  from public.planner_plans p
  left join public.planner_plan_indicators i on i.plan_id=p.id
  where p.id=p_plan_id and p.trashed_at is null
$$;

create or replace function public.planner_plan_validate_external_link(
  p_plan public.planner_plans,
  p_external_kind text,
  p_external_entity_id uuid
)
returns void
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
begin
  if p_external_kind = 'task' then
    if p_plan.scope <> 'household' or not exists (
      select 1 from public.planner_tasks t
      where t.id = p_external_entity_id and t.household_id = p_plan.household_id
    ) then
      raise exception 'invalid Task link for Plan scope' using errcode = '42501';
    end if;
  elsif p_external_kind = 'event' then
    if not exists (
      select 1 from public.planner_events e
      where e.id = p_external_entity_id
        and (
          (p_plan.scope = 'household' and e.scope = 'household' and e.household_id = p_plan.household_id)
          or
          (p_plan.scope = 'personal' and e.scope = 'personal' and e.owner_person_id = p_plan.owner_person_id)
        )
    ) then
      raise exception 'invalid Event link for Plan scope' using errcode = '42501';
    end if;
  else
    raise exception 'invalid external link kind' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.apply_planner_plan_structure_changeset_rpc(
  p_mutation_id text,
  p_idempotency_key text,
  p_request_hash text,
  p_plan_id uuid,
  p_expected_plan_version integer,
  p_changeset jsonb,
  p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor_person_id uuid := public.current_person_id();
  v_actor_account_id uuid := auth.uid();
  v_actor_member_id uuid;
  v_plan public.planner_plans%rowtype;
  v_scope text;
  v_scope_id uuid;
  v_operation text := 'planner.plans.structure.apply';
  v_reservation jsonb;
  v_idempotency_id uuid;
  v_lease_token uuid;
  v_op jsonb;
  v_ops jsonb := coalesce(p_changeset -> 'operations', '[]'::jsonb);
  v_result jsonb;
  v_snapshot jsonb;
  v_op_changed boolean := false;
  v_row_count integer := 0;
  v_outcome text := 'noop';
  v_local_id text;
  v_entity_type text;
  v_action text;
  v_entity_id uuid;
  v_expected_version integer;
  v_payload jsonb;
  v_row_version integer;
  v_new_id uuid;
  v_error_status integer;
  v_error_code text;
  v_error_message text;
  v_error_details jsonb := '{}'::jsonb;
  v_error_body jsonb;
  v_error_detail_text text;
begin
  if v_actor_account_id is null or v_actor_person_id is null then
    raise exception 'authenticated actor required' using errcode = '42501';
  end if;
  if p_mutation_id is null or p_mutation_id !~ '^[A-Za-z0-9._:-]{1,128}$' then
    raise exception 'invalid mutation id' using errcode = '22023';
  end if;
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9._:-]{1,128}$' then
    raise exception 'invalid idempotency key' using errcode = '22023';
  end if;
  if p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid request hash' using errcode = '22023';
  end if;
  if p_expected_plan_version is null then
    raise exception 'expected Plan version required' using errcode = '22023';
  end if;
  if jsonb_typeof(v_ops) <> 'array' then
    raise exception 'operations must be an array' using errcode = '22023';
  end if;

  select * into v_plan from public.planner_plans where id = p_plan_id for update;
  if not found then raise exception 'Plan not found' using errcode = 'P0002'; end if;
  if not public.planner_plan_can_mutate(v_plan.id, 'edit') then
    raise exception 'Plan structure mutation forbidden' using errcode = '42501';
  end if;
  if v_plan.trashed_at is not null or v_plan.lifecycle in ('completed', 'closed') then
    raise exception 'Plan state does not accept structure changes' using errcode = '55000';
  end if;

  v_scope := v_plan.scope;
  v_scope_id := case when v_plan.scope = 'household' then v_plan.household_id else v_plan.owner_person_id end;
  v_actor_member_id := case when v_plan.scope = 'household' then public.current_household_member_id(v_plan.household_id) else null end;

  v_reservation := public.planner_v2_reserve_idempotency(
    v_actor_account_id,
    v_actor_person_id,
    v_scope,
    v_scope_id,
    v_operation,
    'VERSIONED_MUTATION',
    p_idempotency_key,
    p_mutation_id,
    p_request_hash,
    30
  );
  if v_reservation ->> 'outcome' = 'replay' then
    return jsonb_set(v_reservation -> 'response_body', '{outcome}', '"replay"'::jsonb, true);
  end if;
  v_idempotency_id := (v_reservation ->> 'idempotency_id')::uuid;
  v_lease_token := (v_reservation ->> 'lease_token')::uuid;

  begin
    if v_plan.version <> p_expected_plan_version then
      raise exception 'Plan graph version conflict' using errcode='40007',
        detail=jsonb_build_object('current', v_plan.version, 'expected', p_expected_plan_version, 'resource', 'plan')::text;
    end if;

    for v_op in select value from jsonb_array_elements(v_ops)
    loop
      v_local_id := nullif(v_op ->> 'local_id', '');
      v_entity_type := v_op ->> 'entity_type';
      v_action := v_op ->> 'action';
      v_payload := coalesce(v_op -> 'payload', '{}'::jsonb);
      v_entity_id := nullif(v_op ->> 'entity_id', '')::uuid;
      v_expected_version := nullif(v_op ->> 'expected_version', '')::integer;
      v_new_id := null;
      v_op_changed := false;

      if v_entity_type not in ('milestone','measurement','manual_condition','requirement') then
        raise exception 'invalid structure entity type' using errcode = '22023';
      end if;
      if v_action not in ('create','update','set','record','complete','reopen','trash','restore') then
        raise exception 'invalid structure action' using errcode = '22023';
      end if;
      if v_action <> 'create' and v_expected_version is null then
        raise exception 'expected node version required' using errcode = '22023';
      end if;

      if v_entity_type = 'milestone' then
        if v_action = 'create' then
          insert into public.planner_plan_milestones(plan_id, title, description, completion_mode, classification, sort_order)
          values (
            v_plan.id,
            btrim(v_payload ->> 'title'),
            nullif(btrim(v_payload ->> 'description'), ''),
            coalesce(nullif(v_payload ->> 'completion_mode', ''), 'manual'),
            coalesce(nullif(v_payload ->> 'classification', ''), 'necessary'),
            coalesce((v_payload ->> 'sort_order')::integer, 0)
          ) returning id into v_new_id;
          v_op_changed := true;
        else
          select version into v_row_version from public.planner_plan_milestones where id = v_entity_id and plan_id = v_plan.id for update;
          if not found then raise exception 'Milestone not found' using errcode = 'P0002'; end if;
          if v_row_version <> v_expected_version then
            raise exception 'Milestone version conflict' using errcode='40007',
              detail=jsonb_build_object('current', v_row_version, 'expected', v_expected_version, 'resource', 'node')::text;
          end if;
          if v_action = 'update' then
            update public.planner_plan_milestones set
              title = coalesce(nullif(btrim(v_payload ->> 'title'), ''), title),
              description = case when v_payload ? 'description' then nullif(btrim(v_payload ->> 'description'), '') else description end,
              completion_mode = coalesce(nullif(v_payload ->> 'completion_mode', ''), completion_mode),
              classification = coalesce(nullif(v_payload ->> 'classification', ''), classification),
              sort_order = coalesce((v_payload ->> 'sort_order')::integer, sort_order)
            where id = v_entity_id;
            v_op_changed := true;
          elsif v_action = 'complete' then
            update public.planner_plan_milestones set lifecycle='completed', completed_at=now(),
              completed_by_person_id=v_actor_person_id, completed_by_member_id=v_actor_member_id
            where id = v_entity_id and lifecycle <> 'completed';
            get diagnostics v_row_count = row_count;
            v_op_changed := v_row_count > 0;
          elsif v_action = 'reopen' then
            update public.planner_plan_milestones set lifecycle='pending', completed_at=null,
              completed_by_person_id=null, completed_by_member_id=null
            where id = v_entity_id and lifecycle = 'completed';
            get diagnostics v_row_count = row_count;
            v_op_changed := v_row_count > 0;
          elsif v_action = 'trash' then
            update public.planner_plan_milestones set trashed_at=now(), trashed_by_person_id=v_actor_person_id,
              trashed_by_member_id=v_actor_member_id
            where id = v_entity_id and trashed_at is null;
            get diagnostics v_row_count = row_count;
            v_op_changed := v_row_count > 0;
          elsif v_action = 'restore' then
            update public.planner_plan_milestones set trashed_at=null, trashed_by_person_id=null, trashed_by_member_id=null
            where id = v_entity_id and trashed_at is not null;
            get diagnostics v_row_count = row_count;
            v_op_changed := v_row_count > 0;
          else
            raise exception 'invalid milestone action' using errcode = '55000';
          end if;
        end if;
      elsif v_entity_type = 'measurement' then
        if v_action = 'create' then
          insert into public.planner_plan_measurements(plan_id, name, current_value, target_value, unit, target_operator, classification, sort_order)
          values (
            v_plan.id,
            btrim(v_payload ->> 'name'),
            coalesce((v_payload ->> 'current_value')::numeric, 0),
            nullif(v_payload ->> 'target_value', '')::numeric,
            btrim(v_payload ->> 'unit'),
            coalesce(nullif(v_payload ->> 'target_operator', ''), 'gte'),
            coalesce(nullif(v_payload ->> 'classification', ''), 'necessary'),
            coalesce((v_payload ->> 'sort_order')::integer, 0)
          ) returning id into v_new_id;
          v_op_changed := true;
        else
          select version into v_row_version from public.planner_plan_measurements where id = v_entity_id and plan_id = v_plan.id for update;
          if not found then raise exception 'Measurement not found' using errcode = 'P0002'; end if;
          if v_row_version <> v_expected_version then
            raise exception 'Measurement version conflict' using errcode='40007',
              detail=jsonb_build_object('current', v_row_version, 'expected', v_expected_version, 'resource', 'node')::text;
          end if;
          if v_action in ('update','record') then
            update public.planner_plan_measurements set
              name = coalesce(nullif(btrim(v_payload ->> 'name'), ''), name),
              current_value = coalesce((v_payload ->> 'current_value')::numeric, current_value),
              target_value = case when v_payload ? 'target_value' then nullif(v_payload ->> 'target_value', '')::numeric else target_value end,
              unit = coalesce(nullif(btrim(v_payload ->> 'unit'), ''), unit),
              target_operator = coalesce(nullif(v_payload ->> 'target_operator', ''), target_operator),
              classification = coalesce(nullif(v_payload ->> 'classification', ''), classification),
              sort_order = coalesce((v_payload ->> 'sort_order')::integer, sort_order)
            where id = v_entity_id;
            if v_action = 'record' and v_payload ? 'current_value' then
              insert into public.planner_plan_measurement_history(
                plan_id, measurement_id, value, recorded_by_person_id, recorded_by_member_id, operation_id
              ) values (
                v_plan.id, v_entity_id, (v_payload ->> 'current_value')::numeric, v_actor_person_id, v_actor_member_id, p_mutation_id
              ) on conflict do nothing;
            end if;
            v_op_changed := true;
          elsif v_action = 'trash' then
            update public.planner_plan_measurements set trashed_at=now(), trashed_by_person_id=v_actor_person_id,
              trashed_by_member_id=v_actor_member_id
            where id = v_entity_id and trashed_at is null;
            get diagnostics v_row_count = row_count;
            v_op_changed := v_row_count > 0;
          elsif v_action = 'restore' then
            update public.planner_plan_measurements set trashed_at=null, trashed_by_person_id=null, trashed_by_member_id=null
            where id = v_entity_id and trashed_at is not null;
            get diagnostics v_row_count = row_count;
            v_op_changed := v_row_count > 0;
          else
            raise exception 'invalid measurement action' using errcode = '55000';
          end if;
        end if;
      elsif v_entity_type = 'manual_condition' then
        if v_action = 'create' then
          insert into public.planner_plan_manual_conditions(plan_id, label, is_satisfied, classification, sort_order)
          values (
            v_plan.id,
            btrim(v_payload ->> 'label'),
            coalesce((v_payload ->> 'is_satisfied')::boolean, false),
            coalesce(nullif(v_payload ->> 'classification', ''), 'necessary'),
            coalesce((v_payload ->> 'sort_order')::integer, 0)
          ) returning id into v_new_id;
          v_op_changed := true;
        else
          select version into v_row_version from public.planner_plan_manual_conditions where id = v_entity_id and plan_id = v_plan.id for update;
          if not found then raise exception 'Manual condition not found' using errcode = 'P0002'; end if;
          if v_row_version <> v_expected_version then
            raise exception 'Manual condition version conflict' using errcode='40007',
              detail=jsonb_build_object('current', v_row_version, 'expected', v_expected_version, 'resource', 'node')::text;
          end if;
          if v_action in ('update','set') then
            update public.planner_plan_manual_conditions set
              label = coalesce(nullif(btrim(v_payload ->> 'label'), ''), label),
              is_satisfied = coalesce((v_payload ->> 'is_satisfied')::boolean, is_satisfied),
              satisfied_at = case when (v_payload ? 'is_satisfied') and (v_payload ->> 'is_satisfied')::boolean then now() else satisfied_at end,
              satisfied_by_person_id = case when (v_payload ? 'is_satisfied') and (v_payload ->> 'is_satisfied')::boolean then v_actor_person_id else satisfied_by_person_id end,
              satisfied_by_member_id = case when (v_payload ? 'is_satisfied') and (v_payload ->> 'is_satisfied')::boolean then v_actor_member_id else satisfied_by_member_id end,
              classification = coalesce(nullif(v_payload ->> 'classification', ''), classification),
              sort_order = coalesce((v_payload ->> 'sort_order')::integer, sort_order)
            where id = v_entity_id;
            v_op_changed := true;
          elsif v_action = 'trash' then
            update public.planner_plan_manual_conditions set trashed_at=now(), trashed_by_person_id=v_actor_person_id,
              trashed_by_member_id=v_actor_member_id
            where id = v_entity_id and trashed_at is null;
            get diagnostics v_row_count = row_count;
            v_op_changed := v_row_count > 0;
          elsif v_action = 'restore' then
            update public.planner_plan_manual_conditions set trashed_at=null, trashed_by_person_id=null, trashed_by_member_id=null
            where id = v_entity_id and trashed_at is not null;
            get diagnostics v_row_count = row_count;
            v_op_changed := v_row_count > 0;
          else
            raise exception 'invalid manual condition action' using errcode = '55000';
          end if;
        end if;
      elsif v_entity_type = 'requirement' then
        if v_action = 'create' then
          if v_payload ->> 'subject_type' = 'external' then
            perform public.planner_plan_validate_external_link(
              v_plan,
              v_payload ->> 'external_kind',
              coalesce(nullif(v_payload ->> 'external_entity_id', '')::uuid, nullif(v_payload ->> 'external_reference_key', '')::uuid)
            );
          end if;
          insert into public.planner_plan_requirements(
            plan_id, parent_requirement_id, subject_type, milestone_id, measurement_id, manual_condition_id,
            external_kind, external_reference_key, external_entity_id, classification, sort_order
          ) values (
            v_plan.id,
            nullif(v_payload ->> 'parent_requirement_id', '')::uuid,
            v_payload ->> 'subject_type',
            nullif(v_payload ->> 'milestone_id', '')::uuid,
            nullif(v_payload ->> 'measurement_id', '')::uuid,
            nullif(v_payload ->> 'manual_condition_id', '')::uuid,
            v_payload ->> 'external_kind',
            coalesce(nullif(v_payload ->> 'external_reference_key', '')::uuid, nullif(v_payload ->> 'external_entity_id', '')::uuid),
            nullif(v_payload ->> 'external_entity_id', '')::uuid,
            coalesce(nullif(v_payload ->> 'classification', ''), 'necessary'),
            coalesce((v_payload ->> 'sort_order')::integer, 0)
          ) returning id into v_new_id;
          v_op_changed := true;
        else
          select version into v_row_version from public.planner_plan_requirements where id = v_entity_id and plan_id = v_plan.id for update;
          if not found then raise exception 'Requirement not found' using errcode = 'P0002'; end if;
          if v_row_version <> v_expected_version then
            raise exception 'Requirement version conflict' using errcode='40007',
              detail=jsonb_build_object('current', v_row_version, 'expected', v_expected_version, 'resource', 'node')::text;
          end if;
          if v_action = 'update' then
            update public.planner_plan_requirements set
              parent_requirement_id = case when v_payload ? 'parent_requirement_id' then nullif(v_payload ->> 'parent_requirement_id', '')::uuid else parent_requirement_id end,
              classification = coalesce(nullif(v_payload ->> 'classification', ''), classification),
              sort_order = coalesce((v_payload ->> 'sort_order')::integer, sort_order)
            where id = v_entity_id;
            v_op_changed := true;
          elsif v_action = 'trash' then
            update public.planner_plan_requirements set trashed_at=now(), trashed_by_person_id=v_actor_person_id,
              trashed_by_member_id=v_actor_member_id
            where id = v_entity_id and trashed_at is null;
            get diagnostics v_row_count = row_count;
            v_op_changed := v_row_count > 0;
          elsif v_action = 'restore' then
            update public.planner_plan_requirements set trashed_at=null, trashed_by_person_id=null, trashed_by_member_id=null
            where id = v_entity_id and trashed_at is not null;
            get diagnostics v_row_count = row_count;
            v_op_changed := v_row_count > 0;
          else
            raise exception 'invalid requirement action' using errcode = '55000';
          end if;
        end if;
      end if;

      v_result := coalesce(v_result, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'localId', v_local_id,
        'entityType', v_entity_type,
        'action', v_action,
        'entityId', coalesce(v_new_id, v_entity_id),
        'outcome', case when v_op_changed then 'updated' else 'noop' end
      ));
      if v_op_changed then
        v_outcome := 'updated';
      end if;
    end loop;

    if v_outcome <> 'noop' then
      update public.planner_plans set updated_at = now() where id = v_plan.id returning * into v_plan;
      perform public.planner_plan_recompute_automatic_milestones(v_plan.id);
    end if;
    v_snapshot := public.read_planner_plan_graph_rpc(v_plan.id);
    v_result := coalesce(v_result, '[]'::jsonb);
    v_error_body := jsonb_build_object(
      'data', v_snapshot,
      'outcome', v_outcome,
      'noop', v_outcome = 'noop',
      'replay', false,
      'planVersion', v_plan.version,
      'operationId', p_mutation_id,
      'mutationId', p_mutation_id,
      'idempotencyKey', p_idempotency_key,
      'results', v_result
    );

    if v_outcome <> 'noop' then
      perform public.planner_v2_append_audit(
        v_actor_account_id, v_actor_person_id, v_scope, v_scope_id,
        'planner', 'plan.structure.changed',
        'plan', v_plan.id, 'succeeded',
        v_actor_member_id, p_request_id, p_mutation_id,
        jsonb_build_object('plan_id', v_plan.id, 'operation_count', jsonb_array_length(v_ops), 'result_version', v_plan.version)
      );
    end if;

    perform public.planner_v2_complete_idempotency(
      v_idempotency_id, v_lease_token, p_mutation_id, p_request_hash,
      v_actor_account_id, 200, v_error_body, 'completed'
    );
    return v_error_body;
  exception when others then
    get stacked diagnostics v_error_detail_text = PG_EXCEPTION_DETAIL;
    if sqlstate in ('40007','P0008','P0002','55000','42501','22023','22P02','22003','22007','23514','23505','23503','23502') then
      if sqlstate='40007' then
        v_error_status:=412; v_error_code:='version_conflict_v2'; v_error_message:='La version del grafo cambio. Actualiza y reintenta.';
        begin v_error_details:=coalesce(v_error_detail_text,'{}')::jsonb; exception when others then v_error_details:='{}'::jsonb; end;
      elsif sqlstate='P0008' then
        v_error_status:=409; v_error_code:='idempotency_conflict'; v_error_message:='La operacion ya fue procesada con otros datos.';
      elsif sqlstate='P0002' then
        v_error_status:=404; v_error_code:='not_found'; v_error_message:='Plan o elemento no encontrado.';
      elsif sqlstate='55000' then
        v_error_status:=409; v_error_code:='invalid_transition'; v_error_message:='La operacion no es valida para el estado actual.';
      elsif sqlstate='42501' then
        v_error_status:=403; v_error_code:='forbidden'; v_error_message:='No tenes permiso para modificar este Plan.';
      else
        v_error_status:=422; v_error_code:='validation_error'; v_error_message:='El grafo del Plan no es valido.';
      end if;
      v_error_body := jsonb_build_object('error', jsonb_strip_nulls(jsonb_build_object(
        'code', v_error_code,
        'message', v_error_message,
        'request_id', p_request_id,
        'details', case when v_error_details = '{}'::jsonb then null else v_error_details end
      )));
      perform public.planner_v2_complete_idempotency(
        v_idempotency_id, v_lease_token, p_mutation_id, p_request_hash,
        v_actor_account_id, v_error_status, v_error_body, 'failed_stable'
      );
      return jsonb_build_object('__planError', true, 'status', v_error_status, 'code', v_error_code, 'message', v_error_message, 'details', v_error_details, 'body', v_error_body);
    end if;
    raise;
  end;
end;
$$;

revoke all on function public.planner_plan_external_link_dto(public.planner_plans, public.planner_plan_requirements) from public, anon;
grant execute on function public.planner_plan_external_link_dto(public.planner_plans, public.planner_plan_requirements) to authenticated, service_role;
revoke all on function public.planner_plan_validate_external_link(public.planner_plans, text, uuid) from public, anon, authenticated;
revoke all on function public.apply_planner_plan_structure_changeset_rpc(text, text, text, uuid, integer, jsonb, text) from public, anon;
grant execute on function public.apply_planner_plan_structure_changeset_rpc(text, text, text, uuid, integer, jsonb, text) to authenticated, service_role;
revoke all on function public.read_planner_plan_graph_rpc(uuid) from public, anon;
grant execute on function public.read_planner_plan_graph_rpc(uuid) to authenticated, service_role;

comment on function public.apply_planner_plan_structure_changeset_rpc(text, text, text, uuid, integer, jsonb, text) is
  'Integration R1: apply a whole Plan Structure changeset atomically with V2 idempotency, exactly-once audit and one Plan graph version advance.';
comment on column public.planner_plan_requirements.external_entity_id is
  'Stable external Task/Event id exposed by Integration R1 Plan Detail DTO when an external requirement is bound.';

commit;
