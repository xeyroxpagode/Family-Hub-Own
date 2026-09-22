-- E1.1 Task Final — Release Claim, Archive/Unarchive
-- Adds release action for claimable tasks and archived_at column for tasks.

begin;

-- --------------------------------------------------------------------------
-- Archived_at on planner_tasks (orthogonal to lifecycle status)
-- --------------------------------------------------------------------------

alter table public.planner_tasks
  add column if not exists archived_at timestamptz null;

comment on column public.planner_tasks.archived_at
  is 'Orthogonal archive property; valid only for Completed/Verified tasks.';

create index if not exists planner_tasks_household_archived_idx
  on public.planner_tasks (household_id, archived_at)
  where archived_at is not null;

-- --------------------------------------------------------------------------
-- Release Claim (devolver) for V1 claimable tasks
-- Only valid when: assignment_kind = 'members' (was 'anyone'), single assignee is the actor,
-- fulfillment is shared/pending, task is not trashed/cancelled.
-- --------------------------------------------------------------------------

create or replace function public.release_planner_task_v1(
  p_household_id uuid,
  p_task_id uuid,
  p_expected_version integer,
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
  v_config public.planner_task_assignment_configs%rowtype;
  v_fulfillment public.planner_task_fulfillments%rowtype;
  v_updated public.planner_tasks%rowtype;
  v_actor_account uuid := auth.uid();
  v_actor_person uuid := public.current_person_id();
  v_actor_member uuid := public.current_household_member_id(p_household_id);
  v_audit uuid;
  v_reservation jsonb;
  v_response jsonb;
  v_idempotency_error text;
  v_assignee_count integer;
begin
  -- Basic capability checks
  if v_actor_account is null or v_actor_person is null or v_actor_member is null
    or not public.planner_current_actor_has_capability(p_household_id, 'planner.view')
    or not public.planner_current_actor_has_capability(p_household_id, 'task.complete_assigned')
  then return jsonb_build_object('outcome', 'planner_forbidden'); end if;

  if p_expected_version is null then return jsonb_build_object('outcome', 'expected_version_required'); end if;
  if p_idempotency_key is null or length(btrim(p_idempotency_key)) = 0 then
    return jsonb_build_object('outcome', 'idempotency_context_required');
  end if;

  v_idempotency_error := public.planner_task_v1_assert_payload_hash(
    p_operation, p_household_id, p_task_id, null, p_expected_version, p_mutation_id, p_payload_hash
  );
  if v_idempotency_error is not null then
    return jsonb_build_object('outcome', v_idempotency_error);
  end if;

  -- Lock task and config
  select * into v_task from public.planner_tasks
  where id = p_task_id and household_id = p_household_id for update;
  if not found then return jsonb_build_object('outcome', 'not_found'); end if;
  if v_task.trashed_at is not null or v_task.status = 'cancelled' then
    return jsonb_build_object('outcome', 'task_not_operational');
  end if;

  select * into v_config from public.planner_task_assignment_configs
  where task_id = p_task_id for update;
  if not found then return jsonb_build_object('outcome', 'task_assignment_missing'); end if;

  -- Only releasable if assignment was claimed from 'anyone' (now 'members' with single assignee = actor)
  if v_config.assignment_kind <> 'members' or v_config.fulfillment_mode <> 'shared_once' then
    return jsonb_build_object('outcome', 'invalid_assignment');
  end if;

  select count(*) into v_assignee_count
  from public.planner_task_assignees
  where task_id = p_task_id and revoked_at is null;

  if v_assignee_count <> 1 then
    return jsonb_build_object('outcome', 'invalid_assignment');
  end if;

  -- Verify the sole assignee is the actor
  if not exists (
    select 1 from public.planner_task_assignees
    where task_id = p_task_id and member_id = v_actor_member and revoked_at is null
  ) then
    return jsonb_build_object('outcome', 'fulfillment_not_responsible');
  end if;

  -- Verify fulfillment is shared and pending
  select * into v_fulfillment from public.planner_task_fulfillments
  where task_id = p_task_id and fulfillment_scope = 'shared'
    and retired_at is null and inactive_at is null for update;
  if not found or v_fulfillment.status <> 'pending' then
    return jsonb_build_object('outcome', 'fulfillment_invalid_transition');
  end if;

  if v_config.version <> p_expected_version then
    v_response := jsonb_build_object('outcome', 'version_conflict', 'current_version', v_config.version);
    v_reservation := public.planner_v2_reserve_idempotency(
      v_actor_account, v_actor_person, 'household', p_household_id, p_operation,
      'VERSIONED_MUTATION', p_idempotency_key, p_mutation_id, p_payload_hash, 30
    );
    return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 412, v_response, 'failed_stable');
  end if;

  v_reservation := public.planner_v2_reserve_idempotency(
    v_actor_account, v_actor_person, 'household', p_household_id, p_operation,
    'VERSIONED_MUTATION', p_idempotency_key, p_mutation_id, p_payload_hash, 30
  );
  if v_reservation->>'outcome' = 'replay' then
    return coalesce(v_reservation->'response_body', '{}'::jsonb) || jsonb_build_object('outcome', 'replay');
  end if;

  -- Revert assignment: back to 'anyone', remove assignee
  update public.planner_task_assignment_configs
  set assignment_kind = 'anyone', fulfillment_mode = 'shared_once', legacy_backfill = false
  where task_id = p_task_id;

  update public.planner_task_assignees
  set revoked_at = now()
  where task_id = p_task_id and member_id = v_actor_member and revoked_at is null;

  v_updated := public.planner_refresh_task_v0_projection(p_task_id);

  v_audit := public.planner_task_audit_v1(
    p_household_id, p_task_id, v_fulfillment.id, v_actor_member, v_actor_account, v_actor_person,
    'task.released', 'members:shared_once', 'anyone:shared_once', p_request_id, p_mutation_id,
    jsonb_build_object(
      'released_by_member_id', v_actor_member,
      'request_hash', p_payload_hash,
      'idempotency_operation', p_operation,
      'task_version', v_updated.version
    )
  );

  v_response := jsonb_build_object('outcome', 'updated', 'task_version', v_updated.version, 'audit_event_id', v_audit);
  return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 200, v_response, 'completed');
end;
$$;

revoke all on function public.release_planner_task_v1(uuid, uuid, integer, text, text, text, text, text) from public, anon;
grant execute on function public.release_planner_task_v1(uuid, uuid, integer, text, text, text, text, text) to authenticated, service_role;

comment on function public.release_planner_task_v1(uuid, uuid, integer, text, text, text, text, text)
is 'E1.1 atomic release claim for anyone Tasks; reverts assignment to anyone and removes assignee.';

-- --------------------------------------------------------------------------
-- Archive Task (only for Completed/Verified)
-- --------------------------------------------------------------------------

create or replace function public.archive_planner_task_v1(
  p_household_id uuid,
  p_task_id uuid,
  p_expected_version integer,
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
  v_updated public.planner_tasks%rowtype;
  v_actor_account uuid := auth.uid();
  v_actor_person uuid := public.current_person_id();
  v_actor_member uuid := public.current_household_member_id(p_household_id);
  v_audit uuid;
  v_reservation jsonb;
  v_response jsonb;
  v_idempotency_error text;
begin
  if v_actor_account is null or v_actor_person is null or v_actor_member is null
    or not public.planner_current_actor_has_capability(p_household_id, 'planner.view')
    or not public.planner_current_actor_has_capability(p_household_id, 'task.archive')
  then return jsonb_build_object('outcome', 'planner_forbidden'); end if;

  if p_expected_version is null then return jsonb_build_object('outcome', 'expected_version_required'); end if;
  if p_idempotency_key is null or length(btrim(p_idempotency_key)) = 0 then
    return jsonb_build_object('outcome', 'idempotency_context_required');
  end if;

  v_idempotency_error := public.planner_task_v1_assert_payload_hash(
    p_operation, p_household_id, p_task_id, null, p_expected_version, p_mutation_id, p_payload_hash
  );
  if v_idempotency_error is not null then
    return jsonb_build_object('outcome', v_idempotency_error);
  end if;

  select * into v_task from public.planner_tasks
  where id = p_task_id and household_id = p_household_id for update;
  if not found then return jsonb_build_object('outcome', 'not_found'); end if;
  if v_task.trashed_at is not null then
    return jsonb_build_object('outcome', 'task_in_trash');
  end if;
  if v_task.status not in ('completed', 'verified') then
    return jsonb_build_object('outcome', 'invalid_transition');
  end if;
  if v_task.archived_at is not null then
    return jsonb_build_object('outcome', 'noop');
  end if;

  if v_task.version <> p_expected_version then
    v_response := jsonb_build_object('outcome', 'version_conflict', 'current_version', v_task.version);
    v_reservation := public.planner_v2_reserve_idempotency(
      v_actor_account, v_actor_person, 'household', p_household_id, p_operation,
      'VERSIONED_MUTATION', p_idempotency_key, p_mutation_id, p_payload_hash, 30
    );
    return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 412, v_response, 'failed_stable');
  end if;

  v_reservation := public.planner_v2_reserve_idempotency(
    v_actor_account, v_actor_person, 'household', p_household_id, p_operation,
    'VERSIONED_MUTATION', p_idempotency_key, p_mutation_id, p_payload_hash, 30
  );
  if v_reservation->>'outcome' = 'replay' then
    return coalesce(v_reservation->'response_body', '{}'::jsonb) || jsonb_build_object('outcome', 'replay');
  end if;

  update public.planner_tasks
  set archived_at = now()
  where id = p_task_id and household_id = p_household_id;

  v_updated := public.planner_refresh_task_v0_projection(p_task_id);

  v_audit := public.planner_task_audit_v1(
    p_household_id, p_task_id, null, v_actor_member, v_actor_account, v_actor_person,
    'task.archived', v_task.status, v_task.status, p_request_id, p_mutation_id,
    jsonb_build_object(
      'request_hash', p_payload_hash,
      'idempotency_operation', p_operation,
      'task_version', v_updated.version
    )
  );

  v_response := jsonb_build_object('outcome', 'updated', 'task_version', v_updated.version, 'audit_event_id', v_audit);
  return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 200, v_response, 'completed');
end;
$$;

revoke all on function public.archive_planner_task_v1(uuid, uuid, integer, text, text, text, text, text) from public, anon;
grant execute on function public.archive_planner_task_v1(uuid, uuid, integer, text, text, text, text, text) to authenticated, service_role;

comment on function public.archive_planner_task_v1(uuid, uuid, integer, text, text, text, text, text)
is 'E1.1 archive completed/verified task; hides from active views, preserves history.';

-- --------------------------------------------------------------------------
-- Unarchive Task (returns to previous Completed/Verified state)
-- --------------------------------------------------------------------------

create or replace function public.unarchive_planner_task_v1(
  p_household_id uuid,
  p_task_id uuid,
  p_expected_version integer,
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
  v_updated public.planner_tasks%rowtype;
  v_actor_account uuid := auth.uid();
  v_actor_person uuid := public.current_person_id();
  v_actor_member uuid := public.current_household_member_id(p_household_id);
  v_audit uuid;
  v_reservation jsonb;
  v_response jsonb;
  v_idempotency_error text;
begin
  if v_actor_account is null or v_actor_person is null or v_actor_member is null
    or not public.planner_current_actor_has_capability(p_household_id, 'planner.view')
    or not public.planner_current_actor_has_capability(p_household_id, 'task.archive')
  then return jsonb_build_object('outcome', 'planner_forbidden'); end if;

  if p_expected_version is null then return jsonb_build_object('outcome', 'expected_version_required'); end if;
  if p_idempotency_key is null or length(btrim(p_idempotency_key)) = 0 then
    return jsonb_build_object('outcome', 'idempotency_context_required');
  end if;

  v_idempotency_error := public.planner_task_v1_assert_payload_hash(
    p_operation, p_household_id, p_task_id, null, p_expected_version, p_mutation_id, p_payload_hash
  );
  if v_idempotency_error is not null then
    return jsonb_build_object('outcome', v_idempotency_error);
  end if;

  select * into v_task from public.planner_tasks
  where id = p_task_id and household_id = p_household_id for update;
  if not found then return jsonb_build_object('outcome', 'not_found'); end if;
  if v_task.trashed_at is not null then
    return jsonb_build_object('outcome', 'task_in_trash');
  end if;
  if v_task.archived_at is null then
    return jsonb_build_object('outcome', 'noop');
  end if;
  if v_task.status not in ('completed', 'verified') then
    return jsonb_build_object('outcome', 'invalid_transition');
  end if;

  if v_task.version <> p_expected_version then
    v_response := jsonb_build_object('outcome', 'version_conflict', 'current_version', v_task.version);
    v_reservation := public.planner_v2_reserve_idempotency(
      v_actor_account, v_actor_person, 'household', p_household_id, p_operation,
      'VERSIONED_MUTATION', p_idempotency_key, p_mutation_id, p_payload_hash, 30
    );
    return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 412, v_response, 'failed_stable');
  end if;

  v_reservation := public.planner_v2_reserve_idempotency(
    v_actor_account, v_actor_person, 'household', p_household_id, p_operation,
    'VERSIONED_MUTATION', p_idempotency_key, p_mutation_id, p_payload_hash, 30
  );
  if v_reservation->>'outcome' = 'replay' then
    return coalesce(v_reservation->'response_body', '{}'::jsonb) || jsonb_build_object('outcome', 'replay');
  end if;

  update public.planner_tasks
  set archived_at = null
  where id = p_task_id and household_id = p_household_id;

  v_updated := public.planner_refresh_task_v0_projection(p_task_id);

  v_audit := public.planner_task_audit_v1(
    p_household_id, p_task_id, null, v_actor_member, v_actor_account, v_actor_person,
    'task.unarchived', v_task.status, v_task.status, p_request_id, p_mutation_id,
    jsonb_build_object(
      'request_hash', p_payload_hash,
      'idempotency_operation', p_operation,
      'task_version', v_updated.version
    )
  );

  v_response := jsonb_build_object('outcome', 'updated', 'task_version', v_updated.version, 'audit_event_id', v_audit);
  return public.planner_task_v1_complete_idempotency(v_reservation, p_mutation_id, p_payload_hash, v_actor_account, 200, v_response, 'completed');
end;
$$;

revoke all on function public.unarchive_planner_task_v1(uuid, uuid, integer, text, text, text, text, text) from public, anon;
grant execute on function public.unarchive_planner_task_v1(uuid, uuid, integer, text, text, text, text, text) to authenticated, service_role;

comment on function public.unarchive_planner_task_v1(uuid, uuid, integer, text, text, text, text, text)
is 'E1.1 unarchive task; returns to previous completed/verified state.';

commit;