-- M11.3A OLA 2: Consume Shared Mutation Authority
-- Migration: 20260722049000
-- Owner: Plans
-- Purpose: Replace write_planner_plan_graph_rpc to consume V2 atomic idempotency
--          primitives from shared foundation (20260722090000).
--          Removes split reservation that caused REAUD-01.
--          Uses planner_v2_reserve_idempotency + planner_v2_complete_idempotency
--          inside single transaction. Normalizes error codes to canonical.

begin;

-- --------------------------------------------------------------------------
-- Recreate write_planner_plan_graph_rpc with V2 atomic idempotency consumption
-- --------------------------------------------------------------------------

create or replace function public.write_planner_plan_graph_rpc(
  p_mutation_id text,
  p_idempotency_key text,
  p_request_hash text,
  p_entity_type text,
  p_action text,
  p_plan_id uuid default null,
  p_entity_id uuid default null,
  p_expected_version integer default null,
  p_expected_plan_version integer default null,
  p_payload jsonb default '{}'::jsonb,
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
  v_milestone public.planner_plan_milestones%rowtype;
  v_measurement public.planner_plan_measurements%rowtype;
  v_condition public.planner_plan_manual_conditions%rowtype;
  v_requirement public.planner_plan_requirements%rowtype;
  v_operation public.planner_plan_operations%rowtype;
  v_response jsonb;
  v_inserted integer;
  v_transition text;
  v_new_id uuid;
  v_action_name text;
  v_classification text;
  v_scope text;
  v_household_id uuid;
  v_previous_value numeric;
  v_outcome text;
  v_before_state jsonb;
  v_result_state jsonb;
  v_previous_version integer;
  v_result_version integer;
  v_error_status integer;
  v_error_code text;
  v_error_message text;
  v_error_details jsonb;
  v_error_body jsonb;
  v_error_detail_text text;
  v_v2_reservation jsonb;
  v_v2_idempotency_id uuid;
  v_v2_lease_token uuid;
  v_v2_key_state text;
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
  if p_entity_type not in ('plan','milestone','measurement','manual_condition','requirement') then
    raise exception 'invalid Plan graph entity type' using errcode = '22023';
  end if;

  v_canonical_operation := 'planner.plans.' || p_entity_type || '.' || p_action;

  -- Resolve scope and authorization
  if p_entity_type = 'plan' and p_action = 'create' then
    v_scope := coalesce(p_payload ->> 'scope', 'personal');
    if v_scope not in ('personal','household') then
      raise exception 'invalid Plan scope' using errcode = '22023';
    end if;
    if nullif(btrim(p_payload ->> 'objective'), '') is null then
      raise exception 'Plan objective is required' using errcode = '22023';
    end if;
    if v_scope = 'household' then
      v_household_id := nullif(p_payload ->> 'household_id', '')::uuid;
      v_actor_member_id := public.current_household_member_id(v_household_id);
      if v_actor_member_id is null
        or not public.planner_plan_actor_has_capability(v_household_id, 'planner.view')
        or not public.planner_plan_actor_has_capability(v_household_id, 'goal.create_household') then
        raise exception 'household Plan create forbidden' using errcode = '42501';
      end if;
    end if;
  else
    select * into v_plan from public.planner_plans where id = p_plan_id for update;
    if not found then raise exception 'Plan not found' using errcode = 'P0002'; end if;
    v_scope := v_plan.scope;
    v_household_id := v_plan.household_id;
    if not public.planner_plan_can_mutate(v_plan.id,
      case when p_entity_type = 'plan' then
        case when p_action='transition' then coalesce(p_payload->>'transition',p_action) else p_action end
        when p_action in ('trash','restore') then p_action else 'edit' end) then
      raise exception 'Plan graph mutation forbidden' using errcode = '42501';
    end if;
    v_actor_member_id := case when v_plan.scope = 'household'
      then public.current_household_member_id(v_plan.household_id) else null end;
  end if;

  -- V2 Atomic idempotency reservation (single transaction)
  -- Operation class: CREATE_IDEMPOTENT for plan.create, VERSIONED_MUTATION otherwise
  if v_scope = 'household' then
    v_v2_reservation := public.planner_v2_reserve_idempotency(
      v_actor_account_id, v_actor_person_id,
      'household', v_household_id,
      v_canonical_operation,
      case when p_entity_type = 'plan' and p_action = 'create' then 'CREATE_IDEMPOTENT' else 'VERSIONED_MUTATION' end,
      p_idempotency_key,
      p_mutation_id,
      p_request_hash,
      30
    );
    v_v2_idempotency_id := (v_v2_reservation->>'idempotency_id')::uuid;
    v_v2_lease_token := (v_v2_reservation->>'lease_token')::uuid;
    v_v2_key_state := v_v2_reservation->>'outcome';

    if v_v2_key_state = 'replay' then
      return jsonb_set(v_v2_reservation->'response_body', '{outcome}', '"replay"'::jsonb, true);
    end if;
    -- 'reserved' or 'reclaimed' -> proceed to mutation
  else
    -- Personal scope: use planner_plan_operations table (existing pattern)
    insert into public.planner_plan_operations (
      actor_person_id, mutation_id, idempotency_key, request_hash, operation, aggregate_type
    ) values (
      v_actor_person_id, p_mutation_id, p_idempotency_key, p_request_hash,
      p_entity_type || '.' || p_action, p_entity_type
    ) on conflict (actor_person_id, idempotency_key) do nothing;
    get diagnostics v_inserted = row_count;

    if v_inserted = 0 then
      select * into v_operation from public.planner_plan_operations
      where actor_person_id = v_actor_person_id and idempotency_key = p_idempotency_key
      for update;
      if v_operation.request_hash <> p_request_hash
        or v_operation.operation <> p_entity_type || '.' || p_action then
        raise exception 'idempotency key conflict' using errcode = 'P0008';
      end if;
      if v_operation.response_body is null then
        raise exception 'operation still in flight' using errcode = 'P0009';
      end if;
      return jsonb_set(v_operation.response_body, '{outcome}', '"replay"'::jsonb, true);
    end if;
  end if;

  -- Mutation execution
  begin
  if p_entity_type = 'plan' and p_action = 'create' then
    insert into public.planner_plans (
      scope, owner_person_id, household_id, objective, description, lifecycle,
      target_date, finalization_kind, created_by_person_id, created_by_member_id
    ) values (
      v_scope,
      case when v_scope = 'personal' then v_actor_person_id else null end,
      case when v_scope = 'household' then v_household_id else null end,
      btrim(p_payload ->> 'objective'), nullif(btrim(p_payload ->> 'description'), ''),
      'draft', nullif(p_payload ->> 'target_date', '')::date,
      coalesce(nullif(p_payload ->> 'finalization_kind', ''), 'none'),
      v_actor_person_id, v_actor_member_id
    ) returning * into v_plan;
    v_new_id := v_plan.id;
    v_response := jsonb_build_object('data', to_jsonb(v_plan), 'outcome', 'created', 'version', v_plan.version, 'operationId', p_mutation_id);
    v_outcome := 'created';
    v_action_name := 'plan.created';

  else
    if p_entity_type = 'plan' then
      if p_expected_version is null then raise exception 'expected version required' using errcode = '22023'; end if;
      if v_plan.version <> p_expected_version then
        raise exception 'Plan version conflict' using errcode = '40007',
          detail = jsonb_build_object('current',v_plan.version,'expected',p_expected_version,'resource','plan')::text;
      end if;
      v_before_state := public.planner_plan_safe_audit_state('plan',v_plan.id,v_plan.id);
      v_previous_version := v_plan.version;
      if p_action = 'update' then
        if v_plan.trashed_at is not null then
          raise exception 'trashed Plan only permits Plan-level restore' using errcode='55000';
        end if;
        begin
          if
            coalesce(nullif(btrim(p_payload ->> 'objective'), ''), v_plan.objective) is not distinct from v_plan.objective
            and (case when p_payload ? 'description' then nullif(btrim(p_payload ->> 'description'), '') else v_plan.description end)
              is not distinct from v_plan.description
            and (case when p_payload ? 'target_date' then nullif(p_payload ->> 'target_date', '')::date else v_plan.target_date end)
              is not distinct from v_plan.target_date
            and coalesce(nullif(p_payload ->> 'finalization_kind', ''), v_plan.finalization_kind) is not distinct from v_plan.finalization_kind
          then
            v_outcome := 'noop';
          else
            update public.planner_plans set
              objective = coalesce(nullif(btrim(p_payload ->> 'objective'), ''), objective),
              description = case when p_payload ? 'description' then nullif(btrim(p_payload ->> 'description'), '') else description end,
              target_date = case when p_payload ? 'target_date' then nullif(p_payload ->> 'target_date', '')::date else target_date end,
              finalization_kind = coalesce(nullif(p_payload ->> 'finalization_kind', ''), finalization_kind)
            where id = v_plan.id returning * into v_plan;
            v_outcome := 'updated';
          end if;
        exception when datatype_mismatch or datetime_field_overflow or invalid_text_representation then
          raise exception 'invalid Plan update payload' using errcode = '22023';
        end;
        v_action_name := case when v_outcome = 'noop' then null else 'plan.updated' end;
      elsif p_action = 'transition' then
        v_transition := p_payload ->> 'transition';
        if not public.planner_plan_can_mutate(v_plan.id, v_transition) then
          raise exception 'Plan transition forbidden' using errcode = '42501';
        end if;
        if v_plan.trashed_at is not null and v_transition = 'trash' then
          v_outcome := 'noop';
        elsif v_plan.trashed_at is not null and v_transition <> 'restore' then
          raise exception 'trashed Plan only permits Plan-level restore' using errcode='55000';
        elsif v_plan.trashed_at is null and v_transition = 'restore' then
          v_outcome := 'noop';
        elsif (v_transition='activate' and v_plan.lifecycle='active')
          or (v_transition='pause' and v_plan.lifecycle='paused')
          or (v_transition in ('resume','reopen') and v_plan.lifecycle='active')
          or (v_transition='complete' and v_plan.lifecycle='completed')
          or (v_transition='close' and v_plan.lifecycle='closed') then
          v_outcome := 'noop';
        elsif v_transition='archive' and v_plan.lifecycle in ('completed','closed') and v_plan.archived_at is not null then
          v_outcome := 'noop';
        elsif v_transition='unarchive' and v_plan.lifecycle in ('completed','closed') and v_plan.archived_at is null then
          v_outcome := 'noop';
        elsif v_transition = 'activate' and v_plan.lifecycle = 'draft' then
          if not exists (
            select 1 from public.planner_plan_milestones where plan_id = v_plan.id and trashed_at is null
            union all select 1 from public.planner_plan_measurements where plan_id = v_plan.id and trashed_at is null
            union all select 1 from public.planner_plan_manual_conditions where plan_id = v_plan.id and trashed_at is null
          ) then raise exception 'Plan requires useful structure before activation' using errcode = '55000'; end if;
          if exists (
            select 1 from public.planner_plan_requirements
            where plan_id=v_plan.id and trashed_at is null
              and subject_type='external' and classification='necessary'
          ) then raise exception 'unbound external requirement prevents activation' using errcode = '55000'; end if;
          update public.planner_plans set lifecycle='active', activated_at=now(), paused_at=null where id=v_plan.id returning * into v_plan;
          v_outcome := 'updated';
        elsif v_transition = 'pause' and v_plan.lifecycle = 'active' then
          update public.planner_plans set lifecycle='paused', paused_at=now() where id=v_plan.id returning * into v_plan;
          v_outcome := 'updated';
        elsif v_transition = 'resume' and v_plan.lifecycle = 'paused' then
          update public.planner_plans set lifecycle='active', paused_at=null where id=v_plan.id returning * into v_plan;
          v_outcome := 'updated';
        elsif v_transition = 'complete' and v_plan.lifecycle in ('active','paused') then
          if exists (
            select 1 from public.planner_plan_requirements r
            where r.plan_id=v_plan.id and r.trashed_at is null
              and r.parent_requirement_id is null and r.classification='necessary'
              and not public.planner_plan_requirement_satisfied(r.id)
          ) and coalesce((p_payload->>'confirm_unresolved')::boolean,false) is not true then
            raise exception 'unresolved necessary requirements require explicit confirmation' using errcode = '55000';
          end if;
          update public.planner_plans set lifecycle='completed', completed_at=now(), paused_at=null where id=v_plan.id returning * into v_plan;
          v_outcome := 'updated';
        elsif v_transition = 'close' and v_plan.lifecycle in ('active','paused') then
          update public.planner_plans set lifecycle='closed', closed_at=now(), closed_reason=nullif(btrim(p_payload ->> 'closed_reason'), ''), paused_at=null where id=v_plan.id returning * into v_plan;
          v_outcome := 'updated';
        elsif v_transition = 'reopen' and v_plan.lifecycle in ('completed','closed') then
          update public.planner_plans set lifecycle='active', archived_at=null where id=v_plan.id returning * into v_plan;
          v_outcome := 'updated';
        elsif v_transition = 'archive' and v_plan.lifecycle in ('completed','closed') and v_plan.trashed_at is null then
          update public.planner_plans set archived_at=now() where id=v_plan.id returning * into v_plan;
          v_outcome := 'updated';
        elsif v_transition = 'unarchive' and v_plan.lifecycle in ('completed','closed') then
          update public.planner_plans set archived_at=null where id=v_plan.id returning * into v_plan;
          v_outcome := 'updated';
        elsif v_transition = 'trash' and v_plan.trashed_at is null then
          update public.planner_plans set trashed_at=now(), trashed_by_person_id=v_actor_person_id,
            trashed_by_member_id=v_actor_member_id, trash_operation_id=p_mutation_id
          where id=v_plan.id returning * into v_plan;
          v_outcome := 'updated';
        elsif v_transition = 'restore' and v_plan.trashed_at is not null then
          update public.planner_plans set trashed_at=null, trashed_by_person_id=null,
            trashed_by_member_id=null, trash_operation_id=null
          where id=v_plan.id returning * into v_plan;
          v_outcome := 'updated';
        else
          raise exception 'invalid Plan lifecycle transition' using errcode = '55000';
        end if;
        v_action_name := case when v_outcome='noop' then null else case v_transition
          when 'activate' then 'plan.activated'
          when 'pause' then 'plan.paused'
          when 'resume' then 'plan.resumed'
          when 'complete' then 'plan.completed'
          when 'close' then 'plan.closed'
          when 'reopen' then 'plan.reopened'
          when 'archive' then 'plan.archived'
          when 'unarchive' then 'plan.unarchived'
          when 'trash' then 'plan.trashed'
          when 'restore' then 'plan.restored'
        end end;
      else
        raise exception 'invalid Plan action' using errcode = '22023';
      end if;
      v_response := jsonb_build_object('data', to_jsonb(v_plan), 'outcome', v_outcome, 'version', v_plan.version, 'operationId', p_mutation_id);

    elsif p_entity_type = 'milestone' then
      if v_plan.trashed_at is not null then raise exception 'Plan graph is in Trash' using errcode='55000'; end if;
      if v_plan.lifecycle in ('completed','closed') then raise exception 'terminal Plan requires explicit reopen' using errcode='55000'; end if;
      if p_expected_plan_version is null then raise exception 'expected Plan version required' using errcode='22023'; end if;
      if v_plan.version <> p_expected_plan_version then
        raise exception 'Plan graph version conflict' using errcode='40007',
          detail=jsonb_build_object('current',v_plan.version,'expected',p_expected_plan_version,'resource','plan')::text;
      end if;
      if p_action = 'create' then
        v_classification := coalesce(p_payload ->> 'classification', 'necessary');
        insert into public.planner_plan_milestones (plan_id,title,description,completion_mode,classification,sort_order)
        values (v_plan.id,btrim(p_payload->>'title'),nullif(btrim(p_payload->>'description'),''),
          coalesce(p_payload->>'completion_mode','manual'),v_classification,coalesce((p_payload->>'sort_order')::integer,0))
        returning * into v_milestone;
        v_new_id := v_milestone.id;
        insert into public.planner_plan_requirements (plan_id,subject_type,milestone_id,classification,sort_order)
        values (v_plan.id,'milestone',v_milestone.id,v_classification,v_milestone.sort_order);
        v_action_name := 'milestone.created';
        v_outcome := 'created';
      else
        select * into v_milestone from public.planner_plan_milestones where id=p_entity_id and plan_id=v_plan.id for update;
        if not found then raise exception 'Milestone not found' using errcode='P0002'; end if;
        if p_expected_version is null then raise exception 'expected version required' using errcode='22023'; end if;
        if v_milestone.version <> p_expected_version then
          raise exception 'Milestone version conflict' using errcode='40007',
            detail=jsonb_build_object('current',v_milestone.version,'expected',p_expected_version,'resource','node')::text;
        end if;
        v_before_state := public.planner_plan_safe_audit_state('milestone',v_plan.id,v_milestone.id);
        v_previous_version := v_milestone.version;
        if p_action = 'update' then
          begin
            if
              coalesce(nullif(btrim(p_payload->>'title'),''), v_milestone.title) is not distinct from v_milestone.title
              and (case when p_payload ? 'description' then nullif(btrim(p_payload->>'description'),'') else v_milestone.description end)
                is not distinct from v_milestone.description
              and coalesce(p_payload->>'classification', v_milestone.classification) is not distinct from v_milestone.classification
              and coalesce((p_payload->>'sort_order')::integer, v_milestone.sort_order) is not distinct from v_milestone.sort_order
            then
              v_outcome := 'noop';
            else
              update public.planner_plan_milestones set
                title=coalesce(nullif(btrim(p_payload->>'title'),''),title),
                description=case when p_payload ? 'description' then nullif(btrim(p_payload->>'description'),'') else description end,
                classification=coalesce(p_payload->>'classification',classification),
                sort_order=coalesce((p_payload->>'sort_order')::integer,sort_order)
              where id=v_milestone.id returning * into v_milestone;
              update public.planner_plan_requirements set classification=v_milestone.classification
              where milestone_id=v_milestone.id and trashed_at is null;
              v_outcome := 'updated';
            end if;
          exception when datatype_mismatch or invalid_text_representation then
            raise exception 'invalid Milestone update payload' using errcode = '22023';
          end;
        elsif p_action = 'complete' and v_milestone.completion_mode='manual' then
          if v_milestone.lifecycle='completed' then v_outcome := 'noop'; else
            update public.planner_plan_milestones set lifecycle='completed',completed_at=now(),
              completed_by_person_id=v_actor_person_id,completed_by_member_id=v_actor_member_id
            where id=v_milestone.id returning * into v_milestone;
            v_outcome := 'updated';
          end if;
        elsif p_action = 'reopen' and v_milestone.completion_mode='manual' then
          if v_milestone.lifecycle='pending' then v_outcome := 'noop'; else
            update public.planner_plan_milestones set lifecycle='pending',completed_at=null,
              completed_by_person_id=null,completed_by_member_id=null
            where id=v_milestone.id returning * into v_milestone;
            v_outcome := 'updated';
          end if;
        elsif p_action = 'trash' then
          if v_milestone.trashed_at is not null then v_outcome := 'noop'; else
            update public.planner_plan_milestones set trashed_at=now(),trashed_by_person_id=v_actor_person_id,
              trashed_by_member_id=v_actor_member_id where id=v_milestone.id returning * into v_milestone;
            update public.planner_plan_requirements set trashed_at=now(),trashed_by_person_id=v_actor_person_id,
              trashed_by_member_id=v_actor_member_id where milestone_id=v_milestone.id and trashed_at is null;
            v_outcome := 'updated';
          end if;
        elsif p_action = 'restore' then
          if v_milestone.trashed_at is null then v_outcome := 'noop'; else
            update public.planner_plan_milestones set trashed_at=null,trashed_by_person_id=null,
              trashed_by_member_id=null where id=v_milestone.id returning * into v_milestone;
            update public.planner_plan_requirements set trashed_at=null,trashed_by_person_id=null,
              trashed_by_member_id=null where milestone_id=v_milestone.id;
            v_outcome := 'updated';
          end if;
        else raise exception 'invalid Milestone action' using errcode='55000'; end if;
        v_new_id := v_milestone.id;
        v_action_name := case when v_outcome='noop' then null else case p_action
          when 'update' then 'milestone.updated' when 'complete' then 'milestone.completed'
          when 'reopen' then 'milestone.reopened' when 'trash' then 'milestone.trashed'
          when 'restore' then 'milestone.restored' end end;
      end if;
      if v_outcome <> 'noop' then perform public.planner_plan_recompute_automatic_milestones(v_plan.id); end if;
      select * into v_milestone from public.planner_plan_milestones where id=v_new_id;
      v_response := jsonb_build_object('data',to_jsonb(v_milestone),'outcome',v_outcome,'version',v_milestone.version,'operationId',p_mutation_id);

    elsif p_entity_type = 'measurement' then
      if v_plan.trashed_at is not null then raise exception 'Plan graph is in Trash' using errcode='55000'; end if;
      if v_plan.lifecycle in ('completed','closed') then raise exception 'terminal Plan requires explicit reopen' using errcode='55000'; end if;
      if p_expected_plan_version is null then raise exception 'expected Plan version required' using errcode='22023'; end if;
      if v_plan.version <> p_expected_plan_version then
        raise exception 'Plan graph version conflict' using errcode='40007',
          detail=jsonb_build_object('current',v_plan.version,'expected',p_expected_plan_version,'resource','plan')::text;
      end if;
      if p_action = 'create' then
        v_classification := coalesce(p_payload->>'classification','necessary');
        insert into public.planner_plan_measurements (plan_id,name,current_value,target_value,unit,target_operator,classification,sort_order)
        values (v_plan.id,btrim(p_payload->>'name'),coalesce((p_payload->>'current_value')::numeric,0),
          nullif(p_payload->>'target_value','')::numeric,btrim(p_payload->>'unit'),
          coalesce(p_payload->>'target_operator','gte'),v_classification,coalesce((p_payload->>'sort_order')::integer,0))
        returning * into v_measurement;
        v_new_id := v_measurement.id;
        insert into public.planner_plan_requirements (plan_id,subject_type,measurement_id,classification,sort_order)
        values (v_plan.id,'measurement',v_measurement.id,v_classification,v_measurement.sort_order);
        insert into public.planner_plan_measurement_history (plan_id,measurement_id,value,previous_value,recorded_by_person_id,recorded_by_member_id,operation_id)
        values (v_plan.id,v_measurement.id,v_measurement.current_value,null,v_actor_person_id,v_actor_member_id,p_mutation_id);
        v_action_name := 'measurement.created';
        v_outcome := 'created';
      else
        select * into v_measurement from public.planner_plan_measurements where id=p_entity_id and plan_id=v_plan.id for update;
        if not found then raise exception 'Measurement not found' using errcode='P0002'; end if;
        if p_expected_version is null then raise exception 'expected version required' using errcode='22023'; end if;
        if v_measurement.version <> p_expected_version then
          raise exception 'Measurement version conflict' using errcode='40007',
            detail=jsonb_build_object('current',v_measurement.version,'expected',p_expected_version,'resource','node')::text;
        end if;
        v_new_id := v_measurement.id;
        v_before_state := public.planner_plan_safe_audit_state('measurement',v_plan.id,v_measurement.id);
        v_previous_version := v_measurement.version;
        if p_action = 'update' then
          begin
            if
              coalesce(nullif(btrim(p_payload->>'name'),''), v_measurement.name) is not distinct from v_measurement.name
              and (case when p_payload ? 'target_value' then nullif(p_payload->>'target_value','')::numeric else v_measurement.target_value end)
                is not distinct from v_measurement.target_value
              and coalesce(nullif(btrim(p_payload->>'unit'),''), v_measurement.unit) is not distinct from v_measurement.unit
              and coalesce(p_payload->>'target_operator', v_measurement.target_operator) is not distinct from v_measurement.target_operator
              and coalesce(p_payload->>'classification', v_measurement.classification) is not distinct from v_measurement.classification
              and coalesce((p_payload->>'sort_order')::integer, v_measurement.sort_order) is not distinct from v_measurement.sort_order
            then
              v_outcome := 'noop';
            else
              update public.planner_plan_measurements set name=coalesce(nullif(btrim(p_payload->>'name'),''),name),
                target_value=case when p_payload ? 'target_value' then nullif(p_payload->>'target_value','')::numeric else target_value end,
                unit=coalesce(nullif(btrim(p_payload->>'unit'),''),unit),
                target_operator=coalesce(p_payload->>'target_operator',target_operator),
                classification=coalesce(p_payload->>'classification',classification),
                sort_order=coalesce((p_payload->>'sort_order')::integer,sort_order)
              where id=v_measurement.id returning * into v_measurement;
              update public.planner_plan_requirements set classification=v_measurement.classification
              where measurement_id=v_measurement.id and trashed_at is null;
              v_outcome := 'updated';
            end if;
          exception when datatype_mismatch or invalid_text_representation then
            raise exception 'invalid Measurement update payload' using errcode = '22023';
          end;
        elsif p_action = 'record' then
          v_previous_value := v_measurement.current_value;
          update public.planner_plan_measurements set current_value=(p_payload->>'value')::numeric
          where id=v_measurement.id returning * into v_measurement;
          insert into public.planner_plan_measurement_history (plan_id,measurement_id,value,previous_value,recorded_by_person_id,recorded_by_member_id,correction_of_id,operation_id)
          values (v_plan.id,v_measurement.id,v_measurement.current_value,v_previous_value,
            v_actor_person_id,v_actor_member_id,nullif(p_payload->>'correction_of_id','')::uuid,p_mutation_id);
          v_outcome := 'updated';
        elsif p_action = 'trash' then
          if v_measurement.trashed_at is not null then v_outcome := 'noop'; else
            update public.planner_plan_measurements set trashed_at=now(),trashed_by_person_id=v_actor_person_id,
              trashed_by_member_id=v_actor_member_id where id=v_measurement.id returning * into v_measurement;
            update public.planner_plan_requirements set trashed_at=now(),trashed_by_person_id=v_actor_person_id,
              trashed_by_member_id=v_actor_member_id where measurement_id=v_measurement.id and trashed_at is null;
            v_outcome := 'updated';
          end if;
        elsif p_action = 'restore' then
          if v_measurement.trashed_at is null then v_outcome := 'noop'; else
            update public.planner_plan_measurements set trashed_at=null,trashed_by_person_id=null,
              trashed_by_member_id=null where id=v_measurement.id returning * into v_measurement;
            update public.planner_plan_requirements set trashed_at=null,trashed_by_person_id=null,
              trashed_by_member_id=null where measurement_id=v_measurement.id;
            v_outcome := 'updated';
          end if;
        else raise exception 'invalid Measurement action' using errcode='55000'; end if;
        v_action_name := case when v_outcome='noop' then null else case p_action
          when 'update' then 'measurement.updated' when 'record' then 'measurement.recorded'
          when 'trash' then 'measurement.trashed' when 'restore' then 'measurement.restored' end end;
      end if;
      if v_outcome <> 'noop' then perform public.planner_plan_recompute_automatic_milestones(v_plan.id); end if;
      v_response := jsonb_build_object('data',to_jsonb(v_measurement),'outcome',v_outcome,'version',v_measurement.version,'operationId',p_mutation_id);

    elsif p_entity_type = 'manual_condition' then
      if v_plan.trashed_at is not null then raise exception 'Plan graph is in Trash' using errcode='55000'; end if;
      if v_plan.lifecycle in ('completed','closed') then raise exception 'terminal Plan requires explicit reopen' using errcode='55000'; end if;
      if p_expected_plan_version is null then raise exception 'expected Plan version required' using errcode='22023'; end if;
      if v_plan.version <> p_expected_plan_version then
        raise exception 'Plan graph version conflict' using errcode='40007',
          detail=jsonb_build_object('current',v_plan.version,'expected',p_expected_plan_version,'resource','plan')::text;
      end if;
      if p_action = 'create' then
        v_classification := coalesce(p_payload->>'classification','necessary');
        insert into public.planner_plan_manual_conditions (plan_id,label,classification,sort_order)
        values (v_plan.id,btrim(p_payload->>'label'),v_classification,coalesce((p_payload->>'sort_order')::integer,0))
        returning * into v_condition;
        v_new_id := v_condition.id;
        insert into public.planner_plan_requirements (plan_id,subject_type,manual_condition_id,classification,sort_order)
        values (v_plan.id,'manual_condition',v_condition.id,v_classification,v_condition.sort_order);
        v_action_name := 'manual_condition.created';
        v_outcome := 'created';
      else
        select * into v_condition from public.planner_plan_manual_conditions where id=p_entity_id and plan_id=v_plan.id for update;
        if not found then raise exception 'Manual condition not found' using errcode='P0002'; end if;
        if p_expected_version is null then raise exception 'expected version required' using errcode='22023'; end if;
        if v_condition.version <> p_expected_version then
          raise exception 'Manual condition version conflict' using errcode='40007',
            detail=jsonb_build_object('current',v_condition.version,'expected',p_expected_version,'resource','node')::text;
        end if;
        v_new_id := v_condition.id;
        v_before_state := public.planner_plan_safe_audit_state('manual_condition',v_plan.id,v_condition.id);
        v_previous_version := v_condition.version;
        if p_action = 'update' then
          begin
            if
              coalesce(nullif(btrim(p_payload->>'label'),''), v_condition.label) is not distinct from v_condition.label
              and coalesce(p_payload->>'classification', v_condition.classification) is not distinct from v_condition.classification
              and coalesce((p_payload->>'sort_order')::integer, v_condition.sort_order) is not distinct from v_condition.sort_order
            then
              v_outcome := 'noop';
            else
              update public.planner_plan_manual_conditions set label=coalesce(nullif(btrim(p_payload->>'label'),''),label),
                classification=coalesce(p_payload->>'classification',classification),
                sort_order=coalesce((p_payload->>'sort_order')::integer,sort_order)
              where id=v_condition.id returning * into v_condition;
              update public.planner_plan_requirements set classification=v_condition.classification
              where manual_condition_id=v_condition.id and trashed_at is null;
              v_outcome := 'updated';
            end if;
          exception when datatype_mismatch or invalid_text_representation then
            raise exception 'invalid manual condition update payload' using errcode = '22023';
          end;
        elsif p_action = 'set' then
          if v_condition.is_satisfied is not distinct from (p_payload->>'is_satisfied')::boolean then
            v_outcome := 'noop';
          else
            update public.planner_plan_manual_conditions set is_satisfied=(p_payload->>'is_satisfied')::boolean,
              satisfied_at=case when (p_payload->>'is_satisfied')::boolean then now() else null end,
              satisfied_by_person_id=case when (p_payload->>'is_satisfied')::boolean then v_actor_person_id else null end,
              satisfied_by_member_id=case when (p_payload->>'is_satisfied')::boolean then v_actor_member_id else null end
            where id=v_condition.id returning * into v_condition;
            v_outcome := 'updated';
          end if;
        elsif p_action = 'trash' then
          if v_condition.trashed_at is not null then v_outcome := 'noop'; else
            update public.planner_plan_manual_conditions set trashed_at=now(),trashed_by_person_id=v_actor_person_id,
              trashed_by_member_id=v_actor_member_id where id=v_condition.id returning * into v_condition;
            update public.planner_plan_requirements set trashed_at=now(),trashed_by_person_id=v_actor_person_id,
              trashed_by_member_id=v_actor_member_id where manual_condition_id=v_condition.id and trashed_at is null;
            v_outcome := 'updated';
          end if;
        elsif p_action = 'restore' then
          if v_condition.trashed_at is null then v_outcome := 'noop'; else
            update public.planner_plan_manual_conditions set trashed_at=null,trashed_by_person_id=null,
              trashed_by_member_id=null where id=v_condition.id returning * into v_condition;
            update public.planner_plan_requirements set trashed_at=null,trashed_by_person_id=null,
              trashed_by_member_id=null where manual_condition_id=v_condition.id;
            v_outcome := 'updated';
          end if;
        else raise exception 'invalid manual condition action' using errcode='55000'; end if;
        v_action_name := case when v_outcome='noop' then null else case p_action
          when 'update' then 'manual_condition.updated' when 'set' then 'manual_condition.changed'
          when 'trash' then 'manual_condition.trashed' when 'restore' then 'manual_condition.restored' end end;
      end if;
      if v_outcome <> 'noop' then perform public.planner_plan_recompute_automatic_milestones(v_plan.id); end if;
      v_response := jsonb_build_object('data',to_jsonb(v_condition),'outcome',v_outcome,'version',v_condition.version,'operationId',p_mutation_id);

    else
      if v_plan.trashed_at is not null then raise exception 'Plan graph is in Trash' using errcode='55000'; end if;
      if v_plan.lifecycle in ('completed','closed') then raise exception 'terminal Plan requires explicit reopen' using errcode='55000'; end if;
      if p_expected_plan_version is null then raise exception 'expected Plan version required' using errcode='22023'; end if;
      if v_plan.version <> p_expected_plan_version then
        raise exception 'Plan graph version conflict' using errcode='40007',
          detail=jsonb_build_object('current',v_plan.version,'expected',p_expected_plan_version,'resource','plan')::text;
      end if;
      if p_action = 'create' then
        insert into public.planner_plan_requirements (
          plan_id,parent_requirement_id,subject_type,milestone_id,measurement_id,manual_condition_id,
          external_kind,external_reference_key,external_entity_id,classification,sort_order
        ) values (
          v_plan.id,nullif(p_payload->>'parent_requirement_id','')::uuid,p_payload->>'subject_type',
          nullif(p_payload->>'milestone_id','')::uuid,nullif(p_payload->>'measurement_id','')::uuid,
          nullif(p_payload->>'manual_condition_id','')::uuid,p_payload->>'external_kind',
          nullif(p_payload->>'external_reference_key','')::uuid,null,
          p_payload->>'classification',coalesce((p_payload->>'sort_order')::integer,0)
        ) returning * into v_requirement;
        v_new_id := v_requirement.id;
        v_outcome := 'created';
      else
        select * into v_requirement from public.planner_plan_requirements where id=p_entity_id and plan_id=v_plan.id for update;
        if not found then raise exception 'Requirement not found' using errcode='P0002'; end if;
        if p_expected_version is null then raise exception 'expected version required' using errcode='22023'; end if.
        if v_requirement.version <> p_expected_version then
          raise exception 'Requirement version conflict' using errcode='40007',
            detail=jsonb_build_object('current',v_requirement.version,'expected',p_expected_version,'resource','node')::text;
        end if;
        v_new_id := v_requirement.id;
        v_before_state := public.planner_plan_safe_audit_state('requirement',v_plan.id,v_requirement.id);
        v_previous_version := v_requirement.version;
        if p_action = 'update' then
          begin
            if
              (case when p_payload ? 'parent_requirement_id' then nullif(p_payload->>'parent_requirement_id','')::uuid else v_requirement.parent_requirement_id end)
                is not distinct from v_requirement.parent_requirement_id
              and coalesce((p_payload->>'sort_order')::integer, v_requirement.sort_order) is not distinct from v_requirement.sort_order
            then
              v_outcome := 'noop';
            else
              update public.planner_plan_requirements set
                parent_requirement_id=case when p_payload ? 'parent_requirement_id' then nullif(p_payload->>'parent_requirement_id','')::uuid else parent_requirement_id end,
                sort_order=coalesce((p_payload->>'sort_order')::integer,sort_order)
              where id=v_requirement.id returning * into v_requirement;
              v_outcome := 'updated';
            end if;
          exception when datatype_mismatch or invalid_text_representation then
            raise exception 'invalid Requirement update payload' using errcode = '22023';
          end;
        elsif p_action = 'trash' then
          if v_requirement.trashed_at is not null then v_outcome := 'noop'; else
            if exists (select 1 from public.planner_plan_requirements where parent_requirement_id=v_requirement.id and trashed_at is null) then
              raise exception 'Requirement with active children cannot be trashed' using errcode='55000';
            end if.
            update public.planner_plan_requirements set trashed_at=now(),trashed_by_person_id=v_actor_person_id,
              trashed_by_member_id=v_actor_member_id where id=v_requirement.id returning * into v_requirement;
            v_outcome := 'updated';
          end if;
        elsif p_action = 'restore' then
          if v_requirement.trashed_at is null then v_outcome := 'noop'; else
            update public.planner_plan_requirements set trashed_at=null,trashed_by_person_id=null,
              trashed_by_member_id=null where id=v_requirement.id returning * into v_requirement;
            v_outcome := 'updated';
          end if;
        else raise exception 'invalid Requirement action' using errcode='55000'; end if;
      end if;
      if v_outcome <> 'noop' then perform public.planner_plan_recompute_automatic_milestones(v_plan.id); end if;
      v_action_name := case when v_outcome='noop' then null else case p_action
        when 'create' then 'requirement.created' when 'update' then 'requirement.updated'
        when 'trash' then 'requirement.trashed' when 'restore' then 'requirement.restored' end end;
      v_response := jsonb_build_object('data',to_jsonb(v_requirement),'outcome',v_outcome,'version',v_requirement.version,'operationId',p_mutation_id);
    end if;
  end if;

  if p_entity_type <> 'plan' and v_outcome <> 'noop' then
    update public.planner_plans set updated_at=updated_at where id=v_plan.id returning * into v_plan;
    v_response := v_response || jsonb_build_object('planVersion',v_plan.version);
  elsif p_entity_type <> 'plan' then
    v_response := v_response || jsonb_build_object('planVersion',v_plan.version);
  end if;

  v_result_state := public.planner_plan_safe_audit_state(
    p_entity_type,v_plan.id,coalesce(v_new_id,p_entity_id,v_plan.id)
  );
  v_result_version := nullif(v_result_state->>'version','')::integer;
  if v_before_state is null and p_entity_type='plan' and p_action <> 'create' then
    v_before_state := jsonb_build_object('version',v_previous_version);
  end if;

  -- Personal scope completion
  if v_plan.scope='personal' then
    update public.planner_plan_operations set
      aggregate_id=coalesce(v_new_id,p_entity_id,v_plan.id),
      previous_version=v_previous_version,result_version=v_result_version,
      before_state=v_before_state,result_state=v_result_state,outcome=v_outcome,
      response_body=v_response,completed_at=now()
    where actor_person_id=v_actor_person_id and idempotency_key=p_idempotency_key;
  end if;

  -- Household scope: audit + V2 completion
  if v_plan.scope='household' then
    if v_outcome <> 'noop' then
      perform public.planner_v2_append_audit(
        v_actor_account_id, v_actor_person_id, 'household', v_household_id,
        'planner', v_action_name,
        p_entity_type, coalesce(v_new_id,p_entity_id,v_plan.id), 'succeeded',
        v_actor_member_id, p_request_id, p_mutation_id,
        jsonb_build_object(
          'plan_id',v_plan.id,'idempotency_key',p_idempotency_key,
          'previous_version',v_previous_version,'result_version',v_result_version,
          'before_state',coalesce(v_before_state,'null'::jsonb),
          'result_state',coalesce(v_result_state,'null'::jsonb),'outcome',v_outcome
        )
      );
    end if;

-- V2 completion
    if v_v2_idempotency_id is not null and v_v2_lease_token is not null then
      perform public.planner_v2_complete_idempotency(
        v_v2_idempotency_id,
        v_v2_lease_token,
        p_mutation_id,
        p_request_hash,
        v_actor_account_id,
        case when p_action='create' then 201 else 200 end,
        v_response,
        case when v_outcome = 'noop' then 'completed' else 'completed' end
      );
    end if;
  end if;

  return v_response;
  exception when others then
    get stacked diagnostics v_error_detail_text = PG_EXCEPTION_DETAIL;
    if v_scope='household' and v_v2_idempotency_id is not null
      and sqlstate in ('40007','P0008','P0002','55000','42501','22023','22P02','22003','22007','23514','23505','23503','23502') then
      if sqlstate='40007' then
        v_error_status:=412; v_error_code:='version_conflict_v2';
        v_error_message:='La version del grafo cambio. Actualiza y reintenta.';
        begin v_error_details:=coalesce(v_error_detail_text,'{}')::jsonb;
        exception when others then v_error_details:='{}'::jsonb; end;
      elsif sqlstate='P0008' then
        v_error_status:=409; v_error_code:='idempotency_conflict';
        v_error_message:='La operacion ya fue procesada con otros datos.'; v_error_details:='{}'::jsonb;
      elsif sqlstate='P0002' then
        v_error_status:=404; v_error_code:='not_found';
        v_error_message:='Plan o elemento no encontrado.'; v_error_details:='{}'::jsonb;
      elsif sqlstate='55000' then
        v_error_status:=409; v_error_code:='invalid_transition';
        v_error_message:='La operacion no es valida para el estado actual.'; v_error_details:='{}'::jsonb;
      elsif sqlstate='42501' then
        v_error_status:=403; v_error_code:='forbidden';
        v_error_message:='No tenes permiso para modificar este Plan.'; v_error_details:='{}'::jsonb;
      else
        v_error_status:=422; v_error_code:='validation_error';
        v_error_message:='El grafo del Plan no es valido.'; v_error_details:='{}'::jsonb;
      end if;
      v_error_body:=jsonb_build_object('error',jsonb_strip_nulls(jsonb_build_object(
        'code',v_error_code,'message',v_error_message,'request_id',p_request_id,
        'details',case when v_error_details='{}'::jsonb then null else v_error_details end
      )));
      if v_v2_idempotency_id is not null and v_v2_lease_token is not null then
        perform public.planner_v2_complete_idempotency(
          v_v2_idempotency_id,
          v_v2_lease_token,
          p_mutation_id,
          p_request_hash,
          v_actor_account_id,
          v_error_status,
          v_error_body,
          'failed_stable'
        );
      end if;
      return jsonb_build_object('__planError',true,'status',v_error_status,
        'code',v_error_code,'message',v_error_message,'details',v_error_details,'body',v_error_body);
    end if;
    raise;
  end;
end;
$$;

commit;