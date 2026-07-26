-- M11.1B - public Task assignment and fulfillment operations.
-- Additive over M11.1A. Planner V0 remains a derived compatibility projection.

alter table public.planner_task_fulfillments
  add column resubmitted_by_member_id uuid null,
  add column resubmitted_at timestamptz null,
  add column resubmission_note text null;

alter table public.planner_task_fulfillments
  add constraint planner_task_fulfillment_resubmission_actor_fkey
    foreign key (resubmitted_by_member_id, household_id)
    references public.household_members(id, household_id) on delete restrict,
  add constraint planner_task_fulfillment_resubmission_note_check check (
    resubmission_note is null
    or (length(btrim(resubmission_note)) between 1 and 500)
  ),
  add constraint planner_task_fulfillment_correction_comment_max_check check (
    correction_comment is null or length(btrim(correction_comment)) <= 500
  );

alter table public.planner_task_fulfillments
  drop constraint planner_task_fulfillment_state_actor_check;

alter table public.planner_task_fulfillments
  add constraint planner_task_fulfillment_state_actor_check check (
    (
      status = 'pending'
      and completed_by_member_id is null and completed_by_person_id is null and completed_at is null
      and verified_by_member_id is null and verified_by_person_id is null and verified_at is null
      and correction_requested_by_member_id is null and correction_requested_at is null
      and correction_comment is null
      and resubmitted_by_member_id is null and resubmitted_at is null and resubmission_note is null
    )
    or (
      status = 'completed'
      and completed_by_person_id is not null and completed_at is not null
      and verified_by_member_id is null and verified_by_person_id is null and verified_at is null
      and correction_requested_by_member_id is null and correction_requested_at is null
      and correction_comment is null
      and resubmitted_by_member_id is null and resubmitted_at is null and resubmission_note is null
    )
    or (
      status = 'awaiting_verification'
      and completed_by_person_id is not null and completed_at is not null
      and verified_by_member_id is null and verified_by_person_id is null and verified_at is null
      and (
        (
          correction_requested_by_member_id is null and correction_requested_at is null
          and correction_comment is null and resubmitted_by_member_id is null
          and resubmitted_at is null and resubmission_note is null
        )
        or (
          correction_requested_by_member_id is not null and correction_requested_at is not null
          and resubmitted_by_member_id is not null and resubmitted_at is not null
        )
      )
    )
    or (
      status = 'correction_requested'
      and completed_by_person_id is not null and completed_at is not null
      and verified_by_member_id is null and verified_by_person_id is null and verified_at is null
      and correction_requested_by_member_id is not null and correction_requested_at is not null
      and resubmitted_by_member_id is null and resubmitted_at is null and resubmission_note is null
    )
    or (
      status = 'verified'
      and completed_by_person_id is not null and completed_at is not null
      and verified_by_person_id is not null and verified_at is not null
      and (
        (correction_requested_by_member_id is null and correction_requested_at is null
          and resubmitted_by_member_id is null and resubmitted_at is null and resubmission_note is null)
        or (correction_requested_by_member_id is not null and correction_requested_at is not null
          and resubmitted_by_member_id is not null and resubmitted_at is not null)
      )
    )
  );

create or replace function public.planner_task_aggregate_v1(p_task_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with counts as (
    select
      count(*)::integer as total,
      count(*) filter (where status = 'pending')::integer as pending,
      count(*) filter (where status = 'completed')::integer as completed,
      count(*) filter (where status = 'awaiting_verification')::integer as awaiting_verification,
      count(*) filter (where status = 'correction_requested')::integer as correction_requested,
      count(*) filter (where status = 'verified')::integer as verified
    from public.planner_task_fulfillments
    where task_id = p_task_id and retired_at is null and inactive_at is null
  )
  select jsonb_build_object(
    'state', case
      when correction_requested > 0 then 'correction_requested'
      when total = 0 or pending = total then 'pending'
      when pending > 0 then 'partially_completed'
      when awaiting_verification > 0 then 'awaiting_verification'
      when verified = total then 'verified'
      when completed + verified = total then 'completed'
      else 'pending'
    end,
    'total', total,
    'pending', pending,
    'completed', completed,
    'awaitingVerification', awaiting_verification,
    'correctionRequested', correction_requested,
    'verified', verified
  ) from counts
$$;

revoke all on function public.planner_task_aggregate_v1(uuid) from public, anon, authenticated;
grant execute on function public.planner_task_aggregate_v1(uuid) to service_role;

create or replace function public.planner_refresh_task_v0_projection(p_task_id uuid)
returns public.planner_tasks
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_task public.planner_tasks%rowtype;
  v_aggregate jsonb;
  v_status text;
  v_assigned_member uuid;
  v_completed_member uuid;
  v_completed_person uuid;
  v_completed_at timestamptz;
  v_verified_member uuid;
  v_verified_person uuid;
  v_verified_at timestamptz;
begin
  select * into v_task from public.planner_tasks where id = p_task_id for update;
  if not found then raise exception 'task not found' using errcode = 'P0002'; end if;

  v_aggregate := public.planner_task_aggregate_v1(p_task_id);
  if v_task.status = 'cancelled' then
    v_status := 'cancelled';
  else
    v_status := case v_aggregate->>'state'
      when 'correction_requested' then 'pending'
      when 'pending' then 'pending'
      when 'partially_completed' then 'pending'
      when 'awaiting_verification' then 'awaiting_verification'
      when 'verified' then 'verified'
      else 'completed'
    end;
  end if;

  select case when c.assignment_kind = 'members' and count(a.id) = 1
    then min(a.member_id::text)::uuid else null end
  into v_assigned_member
  from public.planner_task_assignment_configs c
  left join public.planner_task_assignees a
    on a.task_id = c.task_id and a.revoked_at is null
  where c.task_id = p_task_id
  group by c.assignment_kind;

  select completed_by_member_id, completed_by_person_id, completed_at
  into v_completed_member, v_completed_person, v_completed_at
  from public.planner_task_fulfillments
  where task_id = p_task_id and retired_at is null and completed_at is not null
  order by completed_at desc limit 1;

  select verified_by_member_id, verified_by_person_id, verified_at
  into v_verified_member, v_verified_person, v_verified_at
  from public.planner_task_fulfillments
  where task_id = p_task_id and retired_at is null and verified_at is not null
  order by verified_at desc limit 1;

  perform set_config('homeplus.planner_internal_projection', 'on', true);
  begin
    update public.planner_tasks
    set status = v_status,
        assigned_to_member_id = v_assigned_member,
        completed_by_member_id = v_completed_member,
        completed_by_person_id = v_completed_person,
        completed_at = v_completed_at,
        verified_by_member_id = v_verified_member,
        verified_by_person_id = v_verified_person,
        verified_at = v_verified_at
    where id = p_task_id returning * into v_task;
  exception when others then
    perform set_config('homeplus.planner_internal_projection', 'off', true);
    raise;
  end;
  perform set_config('homeplus.planner_internal_projection', 'off', true);
  return v_task;
end;
$$;

create or replace function public.planner_task_audit_v1(
  p_household_id uuid,
  p_task_id uuid,
  p_fulfillment_id uuid,
  p_actor_member_id uuid,
  p_actor_account_id uuid,
  p_action text,
  p_from_state text,
  p_to_state text,
  p_request_id text,
  p_operation_id text,
  p_extra jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_id uuid;
begin
  insert into public.audit_events (
    household_id, actor_membership_id, actor_account_id, domain, action,
    aggregate_type, aggregate_id, result, request_id, mutation_id,
    metadata_version, metadata
  ) values (
    p_household_id, p_actor_member_id, p_actor_account_id, 'planner', p_action,
    'task', p_task_id, 'succeeded', p_request_id, p_operation_id, 1,
    jsonb_build_object(
      'task_id', p_task_id,
      'fulfillment_id', p_fulfillment_id,
      'from_state', p_from_state,
      'to_state', p_to_state,
      'operation_id', p_operation_id
    ) || coalesce(p_extra, '{}'::jsonb)
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.planner_task_audit_v1(uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb)
from public, anon, authenticated;
grant execute on function public.planner_task_audit_v1(uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb)
to service_role;

create or replace function public.planner_assert_task_v1_idempotency(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_operation_id text,
  p_idempotency_key text,
  p_idempotency_operation text,
  p_request_hash text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_key public.planner_idempotency_keys%rowtype;
begin
  if p_operation_id is null or p_operation_id !~ '^[A-Za-z0-9._:-]{1,128}$'
    or p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9._:-]{1,128}$'
    or p_idempotency_operation is null or length(btrim(p_idempotency_operation)) = 0
    or p_request_hash is null or p_request_hash !~ '^[0-9a-f]{64}$'
  then
    return 'idempotency_context_required';
  end if;

  select * into v_key
  from public.planner_idempotency_keys
  where household_id = p_household_id
    and actor_member_id = p_actor_member_id
    and idempotency_key = p_idempotency_key
    and operation = p_idempotency_operation
  for update;

  if not found then
    return 'idempotency_context_required';
  end if;
  if v_key.request_hash <> p_request_hash then
    return 'idempotency_conflict';
  end if;
  return null;
end;
$$;

create or replace function public.planner_task_v1_audit_replay(
  p_household_id uuid,
  p_task_id uuid,
  p_actor_account_id uuid,
  p_operation_id text,
  p_idempotency_operation text,
  p_request_hash text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_event public.audit_events%rowtype;
begin
  select * into v_event
  from public.audit_events
  where household_id = p_household_id
    and actor_account_id = p_actor_account_id
    and mutation_id = p_operation_id
    and domain = 'planner'
  order by occurred_at asc
  limit 1;

  if not found then return null; end if;
  if v_event.aggregate_id <> p_task_id
    or v_event.metadata->>'idempotency_operation' is distinct from p_idempotency_operation
    or v_event.metadata->>'request_hash' is distinct from p_request_hash
  then
    return jsonb_build_object('outcome', 'idempotency_conflict');
  end if;
  return jsonb_build_object(
    'outcome', 'replay',
    'task_version', nullif(v_event.metadata->>'task_version', '')::integer,
    'fulfillment_version', nullif(v_event.metadata->>'fulfillment_version', '')::integer,
    'audit_event_id', v_event.id
  );
end;
$$;

revoke all on function public.planner_assert_task_v1_idempotency(uuid, uuid, text, text, text, text)
from public, anon, authenticated;
grant execute on function public.planner_assert_task_v1_idempotency(uuid, uuid, text, text, text, text)
to service_role;
revoke all on function public.planner_task_v1_audit_replay(uuid, uuid, uuid, text, text, text)
from public, anon, authenticated;
grant execute on function public.planner_task_v1_audit_replay(uuid, uuid, uuid, text, text, text)
to service_role;

create or replace function public.update_planner_task_assignment_v1(
  p_household_id uuid,
  p_task_id uuid,
  p_expected_version integer,
  p_assignment_kind text,
  p_fulfillment_mode text,
  p_member_ids uuid[],
  p_confirm_historical_transition boolean,
  p_confirm_legacy_resolution boolean,
  p_request_id text,
  p_operation_id text,
  p_idempotency_key text,
  p_idempotency_operation text,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_task public.planner_tasks%rowtype;
  v_config public.planner_task_assignment_configs%rowtype;
  v_updated_task public.planner_tasks%rowtype;
  v_actor_account uuid := auth.uid();
  v_actor_person uuid := public.current_person_id();
  v_actor_member uuid := public.current_household_member_id(p_household_id);
  v_member_count integer;
  v_distinct_count integer;
  v_has_history boolean;
  v_same boolean;
  v_action text;
  v_audit uuid;
  v_old jsonb;
  v_replay jsonb;
  v_idempotency_error text;
begin
  if v_actor_account is null or v_actor_person is null or v_actor_member is null
    or not public.planner_current_actor_has_capability(p_household_id, 'planner.view')
  then return jsonb_build_object('outcome', 'planner_forbidden'); end if;
  if p_expected_version is null then return jsonb_build_object('outcome', 'expected_version_required'); end if;

  select * into v_task from public.planner_tasks
  where id = p_task_id and household_id = p_household_id for update;
  if not found then return jsonb_build_object('outcome', 'not_found'); end if;
  if v_task.trashed_at is not null or v_task.status = 'cancelled' then
    return jsonb_build_object('outcome', 'task_not_operational');
  end if;
  if not public.planner_current_actor_has_capability(
    p_household_id,
    case when v_task.created_by_member_id = v_actor_member then 'task.edit_own' else 'task.edit_any' end
  ) then return jsonb_build_object('outcome', 'planner_forbidden'); end if;

  v_idempotency_error := public.planner_assert_task_v1_idempotency(
    p_household_id, v_actor_member, p_operation_id, p_idempotency_key,
    p_idempotency_operation, p_request_hash
  );
  if v_idempotency_error is not null then
    return jsonb_build_object('outcome', v_idempotency_error);
  end if;

  select * into v_config from public.planner_task_assignment_configs
  where task_id = p_task_id and household_id = p_household_id for update;
  if not found then raise exception 'task assignment config missing' using errcode = '23514'; end if;
  v_replay := public.planner_task_v1_audit_replay(
    p_household_id, p_task_id, v_actor_account, p_operation_id,
    p_idempotency_operation, p_request_hash
  );
  if v_replay is not null then return v_replay; end if;
  if v_config.version <> p_expected_version then
    return jsonb_build_object('outcome', 'version_conflict', 'current_version', v_config.version);
  end if;

  select count(*), count(distinct member_id)
  into v_member_count, v_distinct_count
  from unnest(coalesce(p_member_ids, array[]::uuid[])) member_id;

  if p_assignment_kind not in ('anyone', 'members')
    or p_fulfillment_mode not in ('shared_once', 'each_person')
    or (p_assignment_kind = 'anyone' and (p_fulfillment_mode <> 'shared_once' or v_member_count <> 0))
    or (p_assignment_kind = 'members' and v_member_count = 0)
    or v_member_count <> v_distinct_count
    or exists (select 1 from unnest(coalesce(p_member_ids, array[]::uuid[])) x where x is null)
  then return jsonb_build_object('outcome', 'invalid_assignment'); end if;

  if exists (
    select 1 from unnest(coalesce(p_member_ids, array[]::uuid[])) x
    where exists (select 1 from public.household_members hm where hm.id = x)
      and not exists (select 1 from public.household_members hm where hm.id = x and hm.household_id = p_household_id)
  ) then return jsonb_build_object('outcome', 'assignment_member_wrong_household'); end if;

  if exists (
    select 1 from unnest(coalesce(p_member_ids, array[]::uuid[])) x
    where not exists (
      select 1 from public.household_members hm
      where hm.id = x and hm.household_id = p_household_id and hm.status = 'active'
    )
  ) then return jsonb_build_object('outcome', 'assignment_member_not_active'); end if;

  if v_config.assignment_kind = 'legacy_unassigned' and not coalesce(p_confirm_legacy_resolution, false) then
    return jsonb_build_object('outcome', 'legacy_assignment_requires_explicit_resolution');
  end if;

  select exists (
    select 1 from public.planner_task_fulfillments f
    where f.task_id = p_task_id and f.retired_at is null and (
      f.status <> 'pending' or f.completed_by_member_id is not null or f.completed_at is not null
      or f.verified_by_member_id is not null or f.verified_at is not null
      or f.correction_requested_by_member_id is not null or f.correction_requested_at is not null
      or f.resubmitted_by_member_id is not null or f.resubmitted_at is not null
    )
  ) into v_has_history;

  if v_has_history and not coalesce(p_confirm_historical_transition, false) then
    return jsonb_build_object('outcome', 'assignment_history_requires_explicit_transition');
  end if;

  select v_config.assignment_kind = p_assignment_kind
    and v_config.fulfillment_mode = p_fulfillment_mode
    and not exists (
      (select a.member_id from public.planner_task_assignees a where a.task_id = p_task_id and a.revoked_at is null
       except select x from unnest(coalesce(p_member_ids, array[]::uuid[])) x)
      union all
      (select x from unnest(coalesce(p_member_ids, array[]::uuid[])) x
       except select a.member_id from public.planner_task_assignees a where a.task_id = p_task_id and a.revoked_at is null)
    ) into v_same;
  if v_same then return jsonb_build_object('outcome', 'noop'); end if;

  v_old := jsonb_build_object(
    'kind', v_config.assignment_kind,
    'mode', v_config.fulfillment_mode,
    'member_ids', (select coalesce(jsonb_agg(a.member_id order by a.member_id), '[]'::jsonb)
      from public.planner_task_assignees a where a.task_id = p_task_id and a.revoked_at is null)
  );

  update public.planner_task_fulfillments set retired_at = now()
  where task_id = p_task_id and retired_at is null;
  update public.planner_task_assignees set revoked_at = now()
  where task_id = p_task_id and revoked_at is null;
  update public.planner_task_assignment_configs
  set assignment_kind = p_assignment_kind,
      fulfillment_mode = p_fulfillment_mode,
      legacy_backfill = false
  where task_id = p_task_id;

  if p_assignment_kind = 'members' then
    insert into public.planner_task_assignees(task_id, household_id, member_id)
    select p_task_id, p_household_id, x from unnest(p_member_ids) x;
  end if;

  if p_assignment_kind = 'members' and p_fulfillment_mode = 'each_person' then
    insert into public.planner_task_fulfillments(task_id, household_id, fulfillment_scope, responsible_member_id)
    select p_task_id, p_household_id, 'individual', x from unnest(p_member_ids) x;
  else
    insert into public.planner_task_fulfillments(task_id, household_id, fulfillment_scope)
    values (p_task_id, p_household_id, 'shared');
  end if;

  v_updated_task := public.planner_refresh_task_v0_projection(p_task_id);
  v_action := case
    when v_config.assignment_kind = 'legacy_unassigned' then 'task.assignment.legacy_resolved'
    when v_has_history then 'task.assignment.history_transition'
    else 'task.assignment.changed'
  end;
  v_audit := public.planner_task_audit_v1(
    p_household_id, p_task_id, null, v_actor_member, v_actor_account, v_action,
    v_config.assignment_kind || ':' || v_config.fulfillment_mode,
    p_assignment_kind || ':' || p_fulfillment_mode,
    p_request_id, p_operation_id,
    jsonb_build_object(
      'previous_assignment', v_old,
      'confirm_historical_transition', v_has_history,
      'request_hash', p_request_hash,
      'idempotency_operation', p_idempotency_operation,
      'task_version', v_updated_task.version
    )
  );
  return jsonb_build_object('outcome', 'updated', 'task_version', v_updated_task.version, 'audit_event_id', v_audit);
end;
$$;

create or replace function public.claim_planner_task_v1(
  p_household_id uuid,
  p_task_id uuid,
  p_expected_version integer,
  p_request_id text,
  p_operation_id text,
  p_idempotency_key text,
  p_idempotency_operation text,
  p_request_hash text
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
  v_actor_member uuid := public.current_household_member_id(p_household_id);
  v_audit uuid;
  v_replay jsonb;
  v_idempotency_error text;
begin
  if v_actor_account is null or v_actor_member is null
    or not public.planner_current_actor_has_capability(p_household_id, 'planner.view')
    or not public.planner_current_actor_has_capability(p_household_id, 'task.complete_assigned')
  then return jsonb_build_object('outcome', 'planner_forbidden'); end if;
  if p_expected_version is null then return jsonb_build_object('outcome', 'expected_version_required'); end if;
  v_idempotency_error := public.planner_assert_task_v1_idempotency(
    p_household_id, v_actor_member, p_operation_id, p_idempotency_key,
    p_idempotency_operation, p_request_hash
  );
  if v_idempotency_error is not null then
    return jsonb_build_object('outcome', v_idempotency_error);
  end if;

  select * into v_task from public.planner_tasks
  where id = p_task_id and household_id = p_household_id for update;
  if not found then return jsonb_build_object('outcome', 'not_found'); end if;
  if v_task.trashed_at is not null or v_task.status = 'cancelled' then
    return jsonb_build_object('outcome', 'task_not_operational');
  end if;
  select * into v_config from public.planner_task_assignment_configs
  where task_id = p_task_id for update;
  v_replay := public.planner_task_v1_audit_replay(
    p_household_id, p_task_id, v_actor_account, p_operation_id,
    p_idempotency_operation, p_request_hash
  );
  if v_replay is not null then return v_replay; end if;
  if v_config.assignment_kind = 'members' then
    if exists (select 1 from public.planner_task_assignees where task_id = p_task_id and member_id = v_actor_member and revoked_at is null)
      and (select count(*) from public.planner_task_assignees where task_id = p_task_id and revoked_at is null) = 1
    then
      if v_config.version <> p_expected_version then
        return jsonb_build_object('outcome', 'version_conflict', 'current_version', v_config.version);
      end if;
      return jsonb_build_object('outcome', 'noop');
    end if;
    return jsonb_build_object('outcome', 'already_claimed');
  end if;
  if v_config.assignment_kind <> 'anyone' or v_config.fulfillment_mode <> 'shared_once' then
    return jsonb_build_object('outcome', 'invalid_assignment');
  end if;
  if v_config.version <> p_expected_version then
    return jsonb_build_object('outcome', 'version_conflict', 'current_version', v_config.version);
  end if;
  select * into v_fulfillment from public.planner_task_fulfillments
  where task_id = p_task_id and fulfillment_scope = 'shared'
    and retired_at is null and inactive_at is null for update;
  if not found or v_fulfillment.status <> 'pending' then
    return jsonb_build_object('outcome', 'fulfillment_invalid_transition');
  end if;

  update public.planner_task_assignment_configs
  set assignment_kind = 'members', fulfillment_mode = 'shared_once', legacy_backfill = false
  where task_id = p_task_id;
  insert into public.planner_task_assignees(task_id, household_id, member_id)
  values (p_task_id, p_household_id, v_actor_member);
  v_updated := public.planner_refresh_task_v0_projection(p_task_id);
  v_audit := public.planner_task_audit_v1(
    p_household_id, p_task_id, v_fulfillment.id, v_actor_member, v_actor_account,
    'task.claimed', 'anyone:shared_once', 'members:shared_once', p_request_id, p_operation_id,
    jsonb_build_object(
      'claimed_by_member_id', v_actor_member,
      'request_hash', p_request_hash,
      'idempotency_operation', p_idempotency_operation,
      'task_version', v_updated.version
    )
  );
  return jsonb_build_object('outcome', 'updated', 'task_version', v_updated.version, 'audit_event_id', v_audit);
end;
$$;

create or replace function public.mutate_planner_task_fulfillment_v1(
  p_household_id uuid,
  p_task_id uuid,
  p_fulfillment_id uuid,
  p_action text,
  p_expected_version integer,
  p_comment text,
  p_note text,
  p_request_id text,
  p_operation_id text,
  p_idempotency_key text,
  p_idempotency_operation text,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_task public.planner_tasks%rowtype;
  v_config public.planner_task_assignment_configs%rowtype;
  v_f public.planner_task_fulfillments%rowtype;
  v_updated public.planner_tasks%rowtype;
  v_actor_account uuid := auth.uid();
  v_actor_person uuid := public.current_person_id();
  v_actor_member uuid := public.current_household_member_id(p_household_id);
  v_is_assignee boolean;
  v_can_complete boolean;
  v_can_manage boolean;
  v_normal_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_normal_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_next text;
  v_event text;
  v_audit uuid;
  v_replay jsonb;
  v_idempotency_error text;
begin
  if p_action not in ('complete','verify','request_correction','resubmit','revert','reopen') then
    return jsonb_build_object('outcome', 'fulfillment_invalid_transition');
  end if;
  if v_actor_account is null or v_actor_person is null or v_actor_member is null
    or not public.planner_current_actor_has_capability(p_household_id, 'planner.view')
  then return jsonb_build_object('outcome', 'planner_forbidden'); end if;
  if p_expected_version is null then return jsonb_build_object('outcome', 'expected_version_required'); end if;
  v_idempotency_error := public.planner_assert_task_v1_idempotency(
    p_household_id, v_actor_member, p_operation_id, p_idempotency_key,
    p_idempotency_operation, p_request_hash
  );
  if v_idempotency_error is not null then
    return jsonb_build_object('outcome', v_idempotency_error);
  end if;
  if length(coalesce(v_normal_comment, '')) > 500 or length(coalesce(v_normal_note, '')) > 500 then
    return jsonb_build_object('outcome', 'fulfillment_invalid_transition');
  end if;

  select * into v_task from public.planner_tasks
  where id = p_task_id and household_id = p_household_id for update;
  if not found then return jsonb_build_object('outcome', 'not_found'); end if;
  select * into v_config from public.planner_task_assignment_configs where task_id = p_task_id;
  select * into v_f from public.planner_task_fulfillments
  where id = p_fulfillment_id and task_id = p_task_id and household_id = p_household_id for update;
  if not found then
    return jsonb_build_object('outcome', 'fulfillment_not_current');
  end if;
  v_replay := public.planner_task_v1_audit_replay(
    p_household_id, p_task_id, v_actor_account, p_operation_id,
    p_idempotency_operation, p_request_hash
  );
  if v_replay is not null then return v_replay; end if;
  if v_task.trashed_at is not null or v_task.status = 'cancelled' then
    return jsonb_build_object('outcome', 'task_not_operational');
  end if;
  if v_f.retired_at is not null or v_f.inactive_at is not null then
    return jsonb_build_object('outcome', 'fulfillment_not_current');
  end if;
  if v_f.version <> p_expected_version then
    return jsonb_build_object('outcome', 'version_conflict', 'current_version', v_f.version);
  end if;

  select exists (select 1 from public.planner_task_assignees
    where task_id = p_task_id and member_id = v_actor_member and revoked_at is null)
  into v_is_assignee;
  v_can_complete := case
    when v_config.assignment_kind = 'legacy_unassigned' then
      public.planner_current_actor_has_capability(p_household_id, 'task.complete_unassigned')
      or public.planner_current_actor_has_capability(p_household_id, 'task.complete_any')
    when v_f.fulfillment_scope = 'individual' and v_f.responsible_member_id = v_actor_member then
      public.planner_current_actor_has_capability(p_household_id, 'task.complete_assigned')
    when v_f.fulfillment_scope = 'shared' and v_config.assignment_kind = 'anyone' then
      public.planner_current_actor_has_capability(p_household_id, 'task.complete_assigned')
    when v_f.fulfillment_scope = 'shared' and v_is_assignee then
      public.planner_current_actor_has_capability(p_household_id, 'task.complete_assigned')
    else public.planner_current_actor_has_capability(p_household_id, 'task.complete_any')
  end;
  v_can_manage := v_f.responsible_member_id = v_actor_member
    or v_f.completed_by_member_id = v_actor_member
    or public.planner_current_actor_has_capability(p_household_id, 'task.complete_any');

  if p_action = 'complete' then
    if not v_can_complete then return jsonb_build_object('outcome', 'fulfillment_not_responsible'); end if;
    if v_f.status in ('completed','awaiting_verification','verified') then
      return jsonb_build_object('outcome', 'noop');
    end if;
  elsif p_action in ('verify','request_correction') then
    if not public.planner_current_actor_has_capability(p_household_id, 'task.verify') then
      return jsonb_build_object('outcome', 'planner_forbidden');
    end if;
    if v_f.completed_by_member_id = v_actor_member then
      return jsonb_build_object('outcome', 'self_verification_not_allowed');
    end if;
    if p_action = 'verify' and v_f.status = 'verified' then
      return jsonb_build_object('outcome', 'noop');
    end if;
    if p_action = 'request_correction' and v_f.status = 'correction_requested'
      and v_f.correction_comment is not distinct from v_normal_comment
    then return jsonb_build_object('outcome', 'noop'); end if;
  elsif p_action in ('resubmit','revert') then
    if not v_can_manage then return jsonb_build_object('outcome', 'fulfillment_not_responsible'); end if;
    if p_action = 'resubmit' and v_f.status in ('awaiting_verification','verified')
      and v_f.resubmitted_at is not null
    then return jsonb_build_object('outcome', 'noop'); end if;
  else
    if not public.planner_current_actor_has_capability(p_household_id, 'task.verify') then
      return jsonb_build_object('outcome', 'planner_forbidden');
    end if;
  end if;

  if p_action = 'complete' then
    if v_f.status <> 'pending' then return jsonb_build_object('outcome', 'fulfillment_invalid_transition'); end if;
    v_next := case when v_task.requires_verification then 'awaiting_verification' else 'completed' end;
    update public.planner_task_fulfillments set
      status = v_next, completed_by_member_id = v_actor_member,
      completed_by_person_id = v_actor_person, completed_at = now(),
      verified_by_member_id = null, verified_by_person_id = null, verified_at = null,
      correction_requested_by_member_id = null, correction_requested_at = null, correction_comment = null,
      resubmitted_by_member_id = null, resubmitted_at = null, resubmission_note = null
    where id = v_f.id;
    v_event := 'task.fulfillment.completed';
  elsif p_action in ('verify','request_correction') then
    if v_f.status <> 'awaiting_verification' then
      return jsonb_build_object('outcome', 'fulfillment_invalid_transition');
    end if;
    if p_action = 'verify' then
      v_next := 'verified';
      update public.planner_task_fulfillments set status = v_next,
        verified_by_member_id = v_actor_member, verified_by_person_id = v_actor_person, verified_at = now()
      where id = v_f.id;
      v_event := 'task.fulfillment.verified';
    else
      v_next := 'correction_requested';
      update public.planner_task_fulfillments set status = v_next,
        correction_requested_by_member_id = v_actor_member,
        correction_requested_at = now(), correction_comment = v_normal_comment,
        resubmitted_by_member_id = null, resubmitted_at = null, resubmission_note = null
      where id = v_f.id;
      v_event := 'task.fulfillment.correction_requested';
    end if;
  elsif p_action = 'resubmit' then
    if v_f.status <> 'correction_requested' then
      return jsonb_build_object('outcome', 'fulfillment_invalid_transition');
    end if;
    v_next := 'awaiting_verification';
    update public.planner_task_fulfillments set status = v_next,
      verified_by_member_id = null, verified_by_person_id = null, verified_at = null,
      resubmitted_by_member_id = v_actor_member, resubmitted_at = now(), resubmission_note = v_normal_note
    where id = v_f.id;
    v_event := 'task.fulfillment.resubmitted';
  elsif p_action = 'revert' then
    if v_f.status <> 'completed' then return jsonb_build_object('outcome', 'fulfillment_invalid_transition'); end if;
    v_next := 'pending';
    update public.planner_task_fulfillments set status = v_next,
      completed_by_member_id = null, completed_by_person_id = null, completed_at = null,
      verified_by_member_id = null, verified_by_person_id = null, verified_at = null,
      correction_requested_by_member_id = null, correction_requested_at = null, correction_comment = null,
      resubmitted_by_member_id = null, resubmitted_at = null, resubmission_note = null
    where id = v_f.id;
    v_event := 'task.fulfillment.reverted';
  else
    if v_f.status <> 'verified' then return jsonb_build_object('outcome', 'fulfillment_invalid_transition'); end if;
    v_next := 'pending';
    update public.planner_task_fulfillments set status = v_next,
      completed_by_member_id = null, completed_by_person_id = null, completed_at = null,
      verified_by_member_id = null, verified_by_person_id = null, verified_at = null,
      correction_requested_by_member_id = null, correction_requested_at = null, correction_comment = null,
      resubmitted_by_member_id = null, resubmitted_at = null, resubmission_note = null
    where id = v_f.id;
    v_event := 'task.fulfillment.reopened';
  end if;

  v_updated := public.planner_refresh_task_v0_projection(p_task_id);
  v_audit := public.planner_task_audit_v1(
    p_household_id, p_task_id, v_f.id, v_actor_member, v_actor_account, v_event,
    v_f.status, v_next, p_request_id, p_operation_id,
    jsonb_build_object(
      'correction_supplied', v_normal_comment is not null,
      'resubmission_supplied', v_normal_note is not null,
      'request_hash', p_request_hash,
      'idempotency_operation', p_idempotency_operation,
      'task_version', v_updated.version,
      'fulfillment_version', v_f.version + 1
    )
  );
  return jsonb_build_object(
    'outcome', 'updated', 'task_version', v_updated.version,
    'fulfillment_version', v_f.version + 1, 'audit_event_id', v_audit
  );
end;
$$;

revoke all on function public.update_planner_task_assignment_v1(uuid, uuid, integer, text, text, uuid[], boolean, boolean, text, text, text, text, text)
from public, anon;
grant execute on function public.update_planner_task_assignment_v1(uuid, uuid, integer, text, text, uuid[], boolean, boolean, text, text, text, text, text)
to authenticated, service_role;
revoke all on function public.claim_planner_task_v1(uuid, uuid, integer, text, text, text, text, text) from public, anon;
grant execute on function public.claim_planner_task_v1(uuid, uuid, integer, text, text, text, text, text) to authenticated, service_role;
revoke all on function public.mutate_planner_task_fulfillment_v1(uuid, uuid, uuid, text, integer, text, text, text, text, text, text, text)
from public, anon;
grant execute on function public.mutate_planner_task_fulfillment_v1(uuid, uuid, uuid, text, integer, text, text, text, text, text, text, text)
to authenticated, service_role;

comment on function public.update_planner_task_assignment_v1(uuid, uuid, integer, text, text, uuid[], boolean, boolean, text, text, text, text, text)
is 'M11.1B atomic assignment update with explicit legacy/history transitions.';
comment on function public.claim_planner_task_v1(uuid, uuid, integer, text, text, text, text, text)
is 'M11.1B atomic first-writer-wins claim for anyone Tasks.';
comment on function public.mutate_planner_task_fulfillment_v1(uuid, uuid, uuid, text, integer, text, text, text, text, text, text, text)
is 'M11.1B versioned concrete-fulfillment transition operation.';

-- Conceptual rollback: stop V1 writers, project canonical current state to
-- planner_tasks, revert application routes, retain canonical rows/audit, then
-- remove these RPCs and additive columns only in a dedicated rollback migration.
