-- HomePlus Core G0.4: feature flag overrides, durable audit and transactional outbox.

create or replace function public.homeplus_json_has_sensitive_data(p_value jsonb)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  v_key text;
  v_child jsonb;
  v_text text;
begin
  if p_value is null then return false; end if;
  if jsonb_typeof(p_value) = 'object' then
    for v_key, v_child in select key, value from jsonb_each(p_value)
    loop
      if lower(v_key) ~ '(^|_)(email|e_mail|phone|telephone|mobile|first_name|last_name|full_name|display_name|name|address|title|description|notes?|query|search_query|token|secret|password|authorization|cookie|headers?|stack|body|payload)($|_)' then
        return true;
      end if;
      if public.homeplus_json_has_sensitive_data(v_child) then return true; end if;
    end loop;
  elsif jsonb_typeof(p_value) = 'array' then
    for v_child in select value from jsonb_array_elements(p_value)
    loop
      if public.homeplus_json_has_sensitive_data(v_child) then return true; end if;
    end loop;
  elsif jsonb_typeof(p_value) = 'string' then
    v_text := trim(both '"' from p_value::text);
    if v_text ~* '[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}'
      or v_text ~* 'bearer[[:space:]]+[A-Za-z0-9._~+/\-]+'
      or v_text ~ 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'
      or v_text ~* '[?&](token|access_token|refresh_token|key|secret|password|signature)='
    then return true; end if;
  end if;
  return false;
end;
$$;

revoke all on function public.homeplus_json_has_sensitive_data(jsonb) from public, anon, authenticated;
grant execute on function public.homeplus_json_has_sensitive_data(jsonb) to service_role;

create table public.feature_flag_overrides (
  id uuid primary key default gen_random_uuid(),
  flag_key text not null,
  environment text not null,
  scope_type text not null,
  scope_id uuid null references public.households(id) on delete cascade,
  enabled boolean null,
  rollout_percentage smallint null,
  kill_switch boolean not null default false,
  starts_at timestamptz null,
  ends_at timestamptz null,
  reason text not null,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feature_flag_overrides_known_key check (flag_key in ('planner.search_entry')),
  constraint feature_flag_overrides_environment check (environment ~ '^[a-z][a-z0-9_-]{1,31}$'),
  constraint feature_flag_overrides_scope check (
    (scope_type = 'global' and scope_id is null)
    or (scope_type = 'household' and scope_id is not null)
  ),
  constraint feature_flag_overrides_value check (kill_switch or enabled is not null),
  constraint feature_flag_overrides_rollout check (rollout_percentage between 0 and 100),
  constraint feature_flag_overrides_window check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint feature_flag_overrides_reason check (length(btrim(reason)) between 1 and 500)
);

create unique index feature_flag_overrides_scope_uidx
  on public.feature_flag_overrides (flag_key, environment, scope_type, coalesce(scope_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index feature_flag_overrides_lookup_idx
  on public.feature_flag_overrides (flag_key, environment, scope_type, scope_id);
alter table public.feature_flag_overrides enable row level security;
revoke all on public.feature_flag_overrides from public, anon, authenticated;
grant select, insert, update, delete on public.feature_flag_overrides to service_role;

comment on table public.feature_flag_overrides is
  'Server-only overrides for definitions registered in HomePlus Core. The frontend is never authoritative.';

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  household_id uuid not null references public.households(id) on delete restrict,
  actor_membership_id uuid null references public.household_members(id) on delete set null,
  actor_account_id uuid null,
  domain text not null,
  action text not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  result text not null,
  request_id text null,
  mutation_id text null,
  metadata_version smallint not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  constraint audit_events_domain check (domain ~ '^[a-z][a-z0-9_]{1,63}$'),
  constraint audit_events_action check (action ~ '^[a-z][a-z0-9_.]{2,127}$'),
  constraint audit_events_aggregate_type check (aggregate_type ~ '^[a-z][a-z0-9_]{1,63}$'),
  constraint audit_events_result check (result in ('succeeded', 'failed', 'denied')),
  constraint audit_events_request_id check (request_id is null or request_id ~ '^[A-Za-z0-9._:-]{1,128}$'),
  constraint audit_events_mutation_id check (mutation_id is null or mutation_id ~ '^[A-Za-z0-9._:-]{1,128}$'),
  constraint audit_events_metadata_version check (metadata_version >= 1),
  constraint audit_events_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint audit_events_metadata_size check (octet_length(metadata::text) <= 4096),
  constraint audit_events_metadata_safe check (not public.homeplus_json_has_sensitive_data(metadata))
);

create index audit_events_household_time_idx on public.audit_events (household_id, occurred_at desc);
create index audit_events_actor_time_idx on public.audit_events (actor_membership_id, occurred_at desc);
create index audit_events_aggregate_time_idx on public.audit_events (aggregate_type, aggregate_id, occurred_at desc);
create index audit_events_request_idx on public.audit_events (request_id) where request_id is not null;
create index audit_events_mutation_idx on public.audit_events (mutation_id) where mutation_id is not null;
alter table public.audit_events enable row level security;
revoke all on public.audit_events from public, anon, authenticated;
grant select, insert on public.audit_events to service_role;

create or replace function public.prevent_audit_event_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'audit_events is append-only' using errcode = '55000';
end;
$$;

create trigger audit_events_prevent_update_delete
before update or delete on public.audit_events
for each row execute function public.prevent_audit_event_mutation();

revoke all on function public.prevent_audit_event_mutation() from public, anon, authenticated;

comment on table public.audit_events is
  'Append-only, server-side audit authority. Metadata is versioned and content-free; ordinary update/delete is rejected.';

create table public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete restrict,
  domain text not null,
  event_type text not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  payload_version smallint not null default 1,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null,
  status text not null default 'pending',
  attempts smallint not null default 0,
  next_attempt_at timestamptz null default now(),
  locked_at timestamptz null,
  locked_by text null,
  processed_at timestamptz null,
  last_error_code text null,
  request_id text null,
  mutation_id text null,
  audit_event_id uuid null references public.audit_events(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outbox_events_domain check (domain ~ '^[a-z][a-z0-9_]{1,63}$'),
  constraint outbox_events_event_type check (event_type ~ '^[a-z][a-z0-9_.]{2,127}$'),
  constraint outbox_events_aggregate_type check (aggregate_type ~ '^[a-z][a-z0-9_]{1,63}$'),
  constraint outbox_events_payload_version check (payload_version >= 1),
  constraint outbox_events_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint outbox_events_payload_size check (octet_length(payload::text) <= 4096),
  constraint outbox_events_payload_safe check (not public.homeplus_json_has_sensitive_data(payload)),
  constraint outbox_events_dedupe_key check (dedupe_key ~ '^[A-Za-z0-9._:-]{1,200}$'),
  constraint outbox_events_status check (status in ('pending', 'processing', 'retry', 'processed', 'dead_letter')),
  constraint outbox_events_attempts check (attempts between 0 and 32767),
  constraint outbox_events_request_id check (request_id is null or request_id ~ '^[A-Za-z0-9._:-]{1,128}$'),
  constraint outbox_events_mutation_id check (mutation_id is null or mutation_id ~ '^[A-Za-z0-9._:-]{1,128}$'),
  constraint outbox_events_error_code check (last_error_code is null or last_error_code ~ '^[a-z][a-z0-9_]{1,127}$'),
  constraint outbox_events_lock_shape check (
    (status = 'processing' and locked_at is not null and locked_by is not null)
    or (status <> 'processing' and locked_at is null and locked_by is null)
  )
);

create unique index outbox_events_dedupe_uidx on public.outbox_events (household_id, event_type, dedupe_key);
create index outbox_events_poll_idx on public.outbox_events (next_attempt_at, created_at)
  where status in ('pending', 'retry');
create index outbox_events_household_time_idx on public.outbox_events (household_id, created_at desc);
create index outbox_events_mutation_idx on public.outbox_events (mutation_id) where mutation_id is not null;
alter table public.outbox_events enable row level security;
revoke all on public.outbox_events from public, anon, authenticated;
grant select, insert, update on public.outbox_events to service_role;

comment on table public.outbox_events is
  'Durable side-effect delivery queue. It is distinct from audit, telemetry and diagnostic logs.';

create or replace function public.record_audit_and_enqueue_outbox(
  p_household_id uuid,
  p_actor_membership_id uuid,
  p_actor_account_id uuid,
  p_domain text,
  p_action text,
  p_aggregate_type text,
  p_aggregate_id uuid,
  p_result text,
  p_request_id text,
  p_mutation_id text,
  p_metadata_version smallint,
  p_metadata jsonb,
  p_event_type text,
  p_payload_version smallint,
  p_payload jsonb,
  p_dedupe_key text
)
returns table(audit_event_id uuid, outbox_event_id uuid)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.audit_events (
    household_id, actor_membership_id, actor_account_id, domain, action,
    aggregate_type, aggregate_id, result, request_id, mutation_id,
    metadata_version, metadata
  ) values (
    p_household_id, p_actor_membership_id, p_actor_account_id, p_domain, p_action,
    p_aggregate_type, p_aggregate_id, p_result, p_request_id, p_mutation_id,
    p_metadata_version, coalesce(p_metadata, '{}'::jsonb)
  ) returning id into audit_event_id;

  insert into public.outbox_events (
    household_id, domain, event_type, aggregate_type, aggregate_id,
    payload_version, payload, dedupe_key, request_id, mutation_id, audit_event_id
  ) values (
    p_household_id, p_domain, p_event_type, p_aggregate_type, p_aggregate_id,
    p_payload_version, coalesce(p_payload, '{}'::jsonb), p_dedupe_key,
    p_request_id, p_mutation_id, audit_event_id
  )
  on conflict (household_id, event_type, dedupe_key)
  do update set updated_at = public.outbox_events.updated_at
  returning id into outbox_event_id;

  return next;
end;
$$;

revoke all on function public.record_audit_and_enqueue_outbox(uuid, uuid, uuid, text, text, text, uuid, text, text, text, smallint, jsonb, text, smallint, jsonb, text) from public, anon, authenticated;
grant execute on function public.record_audit_and_enqueue_outbox(uuid, uuid, uuid, text, text, text, uuid, text, text, text, smallint, jsonb, text, smallint, jsonb, text) to service_role;

create or replace function public.claim_outbox_events(
  p_worker_id text,
  p_batch_size integer default 20,
  p_lease_seconds integer default 60
)
returns setof public.outbox_events
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_worker_id !~ '^[A-Za-z0-9._:-]{1,128}$' then raise exception 'invalid worker id'; end if;
  if p_batch_size < 1 or p_batch_size > 100 then raise exception 'invalid batch size'; end if;
  if p_lease_seconds < 15 or p_lease_seconds > 900 then raise exception 'invalid lease'; end if;

  update public.outbox_events
  set status = 'retry', locked_at = null, locked_by = null,
      next_attempt_at = now(), last_error_code = 'lease_expired', updated_at = now()
  where status = 'processing'
    and locked_at < now() - make_interval(secs => p_lease_seconds);

  return query
  with candidates as (
    select id
    from public.outbox_events
    where status in ('pending', 'retry')
      and coalesce(next_attempt_at, now()) <= now()
    order by next_attempt_at nulls first, created_at
    for update skip locked
    limit p_batch_size
  )
  update public.outbox_events o
  set status = 'processing', attempts = attempts + 1, locked_at = now(),
      locked_by = p_worker_id, updated_at = now()
  from candidates c
  where o.id = c.id
  returning o.*;
end;
$$;

create or replace function public.complete_outbox_event(p_event_id uuid, p_worker_id text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_count integer;
begin
  update public.outbox_events
  set status = 'processed', processed_at = now(), next_attempt_at = null,
      locked_at = null, locked_by = null, last_error_code = null, updated_at = now()
  where id = p_event_id and status = 'processing' and locked_by = p_worker_id;
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

create or replace function public.fail_outbox_event(
  p_event_id uuid,
  p_worker_id text,
  p_error_code text,
  p_dead_letter boolean,
  p_next_attempt_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_count integer;
begin
  if p_error_code !~ '^[a-z][a-z0-9_]{1,127}$' then raise exception 'invalid error code'; end if;
  update public.outbox_events
  set status = case when p_dead_letter then 'dead_letter' else 'retry' end,
      next_attempt_at = case when p_dead_letter then null else p_next_attempt_at end,
      locked_at = null, locked_by = null, last_error_code = p_error_code, updated_at = now()
  where id = p_event_id and status = 'processing' and locked_by = p_worker_id;
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

create or replace function public.retry_dead_letter_outbox_event(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_count integer;
begin
  update public.outbox_events
  set status = 'retry', next_attempt_at = now(), locked_at = null, locked_by = null,
      last_error_code = null, updated_at = now()
  where id = p_event_id and status = 'dead_letter';
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

revoke all on function public.claim_outbox_events(text, integer, integer) from public, anon, authenticated;
revoke all on function public.complete_outbox_event(uuid, text) from public, anon, authenticated;
revoke all on function public.fail_outbox_event(uuid, text, text, boolean, timestamptz) from public, anon, authenticated;
revoke all on function public.retry_dead_letter_outbox_event(uuid) from public, anon, authenticated;
grant execute on function public.claim_outbox_events(text, integer, integer) to service_role;
grant execute on function public.complete_outbox_event(uuid, text) to service_role;
grant execute on function public.fail_outbox_event(uuid, text, text, boolean, timestamptz) to service_role;
grant execute on function public.retry_dead_letter_outbox_event(uuid) to service_role;

create or replace function public.complete_planner_task_with_audit(
  p_household_id uuid,
  p_task_id uuid,
  p_expected_version integer,
  p_actor_membership_id uuid,
  p_actor_account_id uuid,
  p_request_id text,
  p_mutation_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_task public.planner_tasks%rowtype;
  v_updated public.planner_tasks%rowtype;
  v_actor_person_id uuid;
  v_next_status text;
  v_audit_id uuid;
begin
  if auth.uid() is null or auth.uid() <> p_actor_account_id then
    raise exception 'actor account mismatch' using errcode = '42501';
  end if;
  if not public.is_active_household_member(p_household_id)
    or public.current_household_member_id(p_household_id) is distinct from p_actor_membership_id
  then raise exception 'active membership required' using errcode = '42501'; end if;
  v_actor_person_id := public.current_person_id();

  select * into v_task
  from public.planner_tasks
  where id = p_task_id and household_id = p_household_id and trashed_at is null
  for update;
  if not found then return jsonb_build_object('outcome', 'not_found'); end if;
  if v_task.version <> p_expected_version then
    return jsonb_build_object('outcome', 'version_conflict', 'current_version', v_task.version);
  end if;
  if v_task.status in ('completed', 'awaiting_verification', 'verified', 'cancelled') then
    return jsonb_build_object('outcome', 'noop', 'task', to_jsonb(v_task), 'audit_event_id', null);
  end if;

  v_next_status := case when v_task.requires_verification then 'awaiting_verification' else 'completed' end;
  update public.planner_tasks
  set status = v_next_status,
      completed_by_member_id = p_actor_membership_id,
      completed_by_person_id = v_actor_person_id,
      completed_at = now()
  where id = p_task_id
  returning * into v_updated;

  insert into public.audit_events (
    household_id, actor_membership_id, actor_account_id, domain, action,
    aggregate_type, aggregate_id, result, request_id, mutation_id,
    metadata_version, metadata
  ) values (
    p_household_id, p_actor_membership_id, p_actor_account_id, 'planner', 'task.completed',
    'task', p_task_id, 'succeeded', p_request_id, p_mutation_id, 1,
    jsonb_build_object('from_status', v_task.status, 'to_status', v_updated.status)
  ) returning id into v_audit_id;

  return jsonb_build_object('outcome', 'updated', 'task', to_jsonb(v_updated), 'audit_event_id', v_audit_id);
end;
$$;

revoke all on function public.complete_planner_task_with_audit(uuid, uuid, integer, uuid, uuid, text, text) from public, anon;
grant execute on function public.complete_planner_task_with_audit(uuid, uuid, integer, uuid, uuid, text, text) to authenticated, service_role;

comment on function public.complete_planner_task_with_audit(uuid, uuid, integer, uuid, uuid, text, text) is
  'Planner G0.4 adoption proof: task completion and append-only audit commit in the same database transaction. It enqueues no outbox event because completion currently has no side effect.';
