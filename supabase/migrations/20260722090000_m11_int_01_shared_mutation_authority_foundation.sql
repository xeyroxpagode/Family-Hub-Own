-- M11.INT-01 Phase 2: Shared Mutation Authority Foundation
-- Migration: 20260722090000
-- Owner: Integration
-- Purpose: Additive V2 schema for canonical actor/scope idempotency,
--          private atomic helpers, personal audit scope, and legacy backfill.
-- Does NOT: apply lockdown, revoke legacy RPCs, modify domain tables.

begin;

-- ============================================================================
-- PART A: Extend planner_idempotency_keys with V2 identity columns
-- ============================================================================

-- Relax household_id NOT NULL for personal scope
alter table public.planner_idempotency_keys
  alter column household_id drop not null;

-- Relax actor_member_id NOT NULL for personal scope
alter table public.planner_idempotency_keys
  alter column actor_member_id drop not null;

-- Add actor_person_id (durable identity dimension)
alter table public.planner_idempotency_keys
  add column if not exists actor_person_id uuid;

-- Add actor_account_id (validated current binding)
alter table public.planner_idempotency_keys
  add column if not exists actor_account_id uuid;

-- Add scope_type and scope_id
alter table public.planner_idempotency_keys
  add column if not exists scope_type text;

alter table public.planner_idempotency_keys
  add column if not exists scope_id uuid;

-- Add mutation_id (stable across retries)
alter table public.planner_idempotency_keys
  add column if not exists mutation_id text;

-- Add payload_hash (SHA-256 canonical, server-recomputed)
alter table public.planner_idempotency_keys
  add column if not exists payload_hash text;

-- Add operation_class (e.g. CREATE_IDEMPOTENT, VERSIONED_MUTATION)
alter table public.planner_idempotency_keys
  add column if not exists operation_class text;

-- Add explicit state column (in_flight, completed, failed_stable, abandoned)
alter table public.planner_idempotency_keys
  add column if not exists key_state text not null default 'in_flight';

-- Add lease_token and lease_expiry for safe ownership
alter table public.planner_idempotency_keys
  add column if not exists lease_token uuid;

alter table public.planner_idempotency_keys
  add column if not exists lease_expiry timestamptz;

-- Add completion metadata
alter table public.planner_idempotency_keys
  add column if not exists completed_at timestamptz;

alter table public.planner_idempotency_keys
  add column if not exists recovered_at timestamptz;

alter table public.planner_idempotency_keys
  add column if not exists recovery_evidence text;

-- ============================================================================
-- PART A.1: State constraint
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'planner_idempotency_keys_key_state_valid'
      and conrelid = 'public.planner_idempotency_keys'::regclass
  ) then
    alter table public.planner_idempotency_keys
      add constraint planner_idempotency_keys_key_state_valid
      check (key_state in ('in_flight', 'completed', 'failed_stable', 'abandoned'));
  end if;
end;
$$;

-- ============================================================================
-- PART A.2: Scope type constraint
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'planner_idempotency_keys_scope_type_valid'
      and conrelid = 'public.planner_idempotency_keys'::regclass
  ) then
    alter table public.planner_idempotency_keys
      add constraint planner_idempotency_keys_scope_type_valid
      check (scope_type in ('personal', 'household'));
  end if;
end;
$$;

-- ============================================================================
-- PART A.3: Mutation ID constraint
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'planner_idempotency_keys_mutation_id_safe'
      and conrelid = 'public.planner_idempotency_keys'::regclass
  ) then
    alter table public.planner_idempotency_keys
      add constraint planner_idempotency_keys_mutation_id_safe
      check (
        mutation_id is null
        or mutation_id ~ '^[A-Za-z0-9._:-]{1,128}$'
      );
  end if;
end;
$$;

-- ============================================================================
-- PART A.4: Payload hash constraint
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'planner_idempotency_keys_payload_hash_safe'
      and conrelid = 'public.planner_idempotency_keys'::regclass
  ) then
    alter table public.planner_idempotency_keys
      add constraint planner_idempotency_keys_payload_hash_safe
      check (
        payload_hash is null
        or payload_hash ~ '^[a-f0-9]{64}$'
      );
  end if;
end;
$$;

-- ============================================================================
-- PART A.5: Operation class constraint
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'planner_idempotency_keys_operation_class_valid'
      and conrelid = 'public.planner_idempotency_keys'::regclass
  ) then
    alter table public.planner_idempotency_keys
      add constraint planner_idempotency_keys_operation_class_valid
      check (
        operation_class is null
        or operation_class in (
          'CREATE_IDEMPOTENT',
          'VERSIONED_MUTATION',
          'NON_VERSIONED_MUTATION'
        )
      );
  end if;
end;
$$;

-- ============================================================================
-- PART B: V2 unique identity (actor_person_id, scope_type, scope_id, operation, idempotency_key)
-- The legacy unique (household_id, actor_member_id, idempotency_key, operation)
-- is preserved temporarily for V0 compatibility.
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'planner_idempotency_keys_v2_identity_uidx'
  ) then
    create unique index planner_idempotency_keys_v2_identity_uidx
      on public.planner_idempotency_keys
      (actor_person_id, scope_type, scope_id, operation, idempotency_key)
      where actor_person_id is not null
        and scope_type is not null
        and scope_id is not null;
  end if;
end;
$$;

-- ============================================================================
-- PART B.1: Mutation binding uniqueness
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'planner_idempotency_keys_mutation_uidx'
  ) then
    create unique index planner_idempotency_keys_mutation_uidx
      on public.planner_idempotency_keys (mutation_id)
      where mutation_id is not null;
  end if;
end;
$$;

-- ============================================================================
-- PART B.2: Lease token uniqueness
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'planner_idempotency_keys_lease_token_uidx'
  ) then
    create unique index planner_idempotency_keys_lease_token_uidx
      on public.planner_idempotency_keys (lease_token)
      where lease_token is not null;
  end if;
end;
$$;

-- ============================================================================
-- PART B.3: Indexes for V2 queries
-- ============================================================================

create index if not exists planner_idempotency_keys_v2_expires_idx
  on public.planner_idempotency_keys (key_state, lease_expiry)
  where key_state = 'in_flight';

create index if not exists planner_idempotency_keys_scope_idx
  on public.planner_idempotency_keys (scope_type, scope_id);

create index if not exists planner_idempotency_keys_actor_person_idx
  on public.planner_idempotency_keys (actor_person_id);

-- ============================================================================
-- PART C: Canonical compact JSON text helper (recursive, sorted keys)
-- Produces identical text to JavaScript sortByKey + JSON.stringify with null-stripping.
-- ============================================================================

create or replace function public.planner_canonical_jsonb_text_v2(p_value jsonb)
returns text
language plpgsql
immutable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_pair record;
  v_parts text[];
  v_type text;
  v_elem jsonb;
  v_elem_parts text[];
begin
  if p_value is null then
    return 'null';
  end if;

  v_type := jsonb_typeof(p_value);

  -- Scalar values via to_json() which matches JS JSON.stringify for primitives
  if v_type in ('string', 'number', 'boolean') then
    return to_json(p_value)::text;
  end if;

  if v_type = 'null' then
    return 'null';
  end if;

  -- Array: preserve order, recurse per element
  if v_type = 'array' then
    v_elem_parts := ARRAY[]::text[];
    for v_elem in select jsonb_array_elements(p_value)
    loop
      v_elem_parts := array_append(v_elem_parts, public.planner_canonical_jsonb_text_v2(v_elem));
    end loop;
    return '[' || array_to_string(v_elem_parts, ',') || ']';
  end if;

  -- Object: sorted keys lexicographically, recurse, omit null-valued keys
  if v_type = 'object' then
    v_parts := ARRAY[]::text[];
    for v_pair in
      select key, value
      from jsonb_each(p_value)
      where jsonb_typeof(value) <> 'null'
      order by key
    loop
      v_parts := array_append(v_parts,
        to_json(v_pair.key)::text || ':' || public.planner_canonical_jsonb_text_v2(v_pair.value));
    end loop;
    return '{' || array_to_string(v_parts, ',') || '}';
  end if;

  -- Fallback (should not reach): use to_json for safe representation
  return to_json(p_value)::text;
end;
$$;

-- ============================================================================
-- PART C.1: Canonical request builder into compact JSON text
-- ============================================================================

create or replace function public.planner_canonical_request_text_v2(
  p_operation text,
  p_scope_type text,
  p_scope_id uuid,
  p_target_id uuid,
  p_payload jsonb,
  p_expected_version integer,
  p_mutation_id text
)
returns text
language plpgsql
immutable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_obj jsonb;
begin
  -- Build the canonical object with the exact field names and order JS uses.
  -- The object jsonb internal key order does not matter because
  -- planner_canonical_jsonb_text_v2 will sort keys lexicographically.
  v_obj := jsonb_build_object(
    'operation',     p_operation,
    'scope_type',    p_scope_type,
    'scope_id',      to_json(p_scope_id::text)::jsonb,
    'target_id',     case when p_target_id is null then null::jsonb else to_json(p_target_id::text)::jsonb end,
    'payload',       case when p_payload is null then null::jsonb else p_payload end,
    'expected_version', case when p_expected_version is null then null::jsonb else to_json(p_expected_version)::jsonb end,
    'mutation_id',   p_mutation_id
  );

  return public.planner_canonical_jsonb_text_v2(v_obj);
end;
$$;

-- ============================================================================
-- PART C.2: Canonical payload hash function
-- Now uses sorted compact text, matching JavaScript hashIdempotencyRequestV2 exactly.
-- R2 correction (M11-INT01-P2-F02): uses digest(text, 'sha256') from pgcrypto
-- instead of sha256(text::bytea). The text::bytea cast is not UTF-8 safe and
-- fails with SQLSTATE 22P02 on payloads containing " (0x22) or \n (0x0A).
-- digest() accepts text directly and produces SHA-256 identical to Node.js.
-- ============================================================================

create or replace function public.planner_canonical_request_hash_v2(
  p_operation text,
  p_scope_type text,
  p_scope_id uuid,
  p_target_id uuid,
  p_payload jsonb,
  p_expected_version integer,
  p_mutation_id text
)
returns text
language plpgsql
immutable
security definer
set search_path = pg_catalog, public
as $$
begin
  -- Use digest(text, 'sha256') from pgcrypto to avoid the unsafe text::bytea cast.
  -- text::bytea interprets \n (0x0A), \" (0x22), and other octets as escape prefixes
  -- instead of UTF-8 bytes, causing SQLSTATE 22P02 on payloads with those characters.
  -- digest() accepts text directly and produces identical SHA-256 to Node.js
  -- crypto.createHash('sha256').update(string).digest('hex').
  -- `extensions.digest` is the fully-qualified pgcrypto overload that takes (text, text).
  -- Explicit qualification keeps the SECURITY DEFINER search_path minimal
  -- (pg_catalog, public) and is resolvable by the static lint.
  return encode(extensions.digest(public.planner_canonical_request_text_v2(
    p_operation, p_scope_type, p_scope_id, p_target_id,
    p_payload, p_expected_version, p_mutation_id
  ), 'sha256'), 'hex');
end;
$$;

-- Revoke public access from all three functions
revoke all on function public.planner_canonical_jsonb_text_v2(jsonb)
  from public, anon, authenticated;
revoke all on function public.planner_canonical_request_text_v2(text, text, uuid, uuid, jsonb, integer, text)
  from public, anon, authenticated;
revoke all on function public.planner_canonical_request_hash_v2(text, text, uuid, uuid, jsonb, integer, text)
  from public, anon, authenticated;

comment on function public.planner_canonical_jsonb_text_v2(jsonb) is
  'Integration-owned recursive sorted compact JSON text builder. Matches JS sortByKey + JSON.stringify. Not executable by PUBLIC/anon/authenticated.';
comment on function public.planner_canonical_request_text_v2(text, text, uuid, uuid, jsonb, integer, text) is
  'Integration-owned V2 canonical request text builder. Not executable by PUBLIC/anon/authenticated.';
comment on function public.planner_canonical_request_hash_v2(text, text, uuid, uuid, jsonb, integer, text) is
  'Integration-owned V2 canonical payload hash. Not executable by PUBLIC/anon/authenticated.';

-- ============================================================================
-- PART D: V2 private reservation helper
-- Atomic INSERT ... ON CONFLICT DO NOTHING followed by SELECT ... FOR UPDATE.
-- Only executable internally by operation-specific RPCs (SECURITY DEFINER).
-- ============================================================================

create or replace function public.planner_v2_reserve_idempotency(
  p_actor_account_id uuid,
  p_actor_person_id uuid,
  p_scope_type text,
  p_scope_id uuid,
  p_operation text,
  p_operation_class text,
  p_idempotency_key text,
  p_mutation_id text,
  p_payload_hash text,
  p_lease_seconds integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_existing public.planner_idempotency_keys%rowtype;
  v_lease_token uuid;
  v_lease_expiry timestamptz;
  v_inserted boolean;
begin
  if p_actor_account_id is null
    or p_actor_person_id is null
    or p_scope_type is null
    or p_scope_id is null
    or p_operation is null
    or p_idempotency_key is null
    or p_mutation_id is null
    or p_payload_hash is null
  then
    raise exception 'V2 reservation requires actor, scope, key, mutation and hash.'
      using errcode = '42501';
  end if;

  if p_lease_seconds < 5 or p_lease_seconds > 120 then
    raise exception 'V2 lease must be 5–120 seconds.'
      using errcode = '42501';
  end if;

  v_lease_token := gen_random_uuid();
  v_lease_expiry := now() + (p_lease_seconds || ' seconds')::interval;

  -- Atomic insert attempt
  insert into public.planner_idempotency_keys (
    household_id, actor_member_id,
    actor_account_id, actor_person_id,
    scope_type, scope_id,
    operation, operation_class,
    idempotency_key,
    mutation_id, payload_hash,
    request_hash,
    key_state,
    lease_token, lease_expiry,
    response_status, response_body,
    expires_at, last_seen_at
  ) values (
    case when p_scope_type = 'household' then p_scope_id else null end,
    null,  -- membership resolved by caller; not stored in V2 identity
    p_actor_account_id, p_actor_person_id,
    p_scope_type, p_scope_id,
    p_operation, p_operation_class,
    p_idempotency_key,
    p_mutation_id, p_payload_hash,
    p_payload_hash,  -- request_hash maintained for legacy compat
    'in_flight',
    v_lease_token, v_lease_expiry,
    0, jsonb_build_object('__inflight', true),
    v_lease_expiry, now()
  )
  on conflict (actor_person_id, scope_type, scope_id, operation, idempotency_key)
    where actor_person_id is not null
      and scope_type is not null
      and scope_id is not null
  do nothing;

  get diagnostics v_inserted = row_count;

  -- Whether inserted or existing, lock and read the row
  select *
  into v_existing
  from public.planner_idempotency_keys
  where actor_person_id = p_actor_person_id
    and scope_type = p_scope_type
    and scope_id = p_scope_id
    and operation = p_operation
    and idempotency_key = p_idempotency_key
  for update;

  if v_existing is null then
    raise exception 'V2 reservation row missing after arbitration.'
      using errcode = 'XX000';
  end if;

  -- If we just inserted: success (in_flight with our lease)
  if v_inserted then
    return jsonb_build_object(
      'outcome', 'reserved',
      'idempotency_id', v_existing.id,
      'lease_token', v_lease_token,
      'lease_expiry', v_lease_expiry
    );
  end if;

  -- Existing row -- check state and bindings

  -- completed or failed_stable: replay
  if v_existing.key_state in ('completed', 'failed_stable') then
    if v_existing.mutation_id = p_mutation_id
      and v_existing.payload_hash = p_payload_hash
    then
      return jsonb_build_object(
        'outcome', 'replay',
        'idempotency_id', v_existing.id,
        'response_status', v_existing.response_status,
        'response_body', v_existing.response_body,
        'key_state', v_existing.key_state
      );
    end if;

    -- Different binding on completed row
    raise exception
      'La operacion ya fue procesada con otros datos.'
      using errcode = 'P0008';
  end if;

  -- in_flight with valid lease
  if v_existing.key_state = 'in_flight'
    and v_existing.lease_expiry > now()
    and v_existing.lease_token is not null
  then
    if v_existing.mutation_id = p_mutation_id
      and v_existing.payload_hash = p_payload_hash
    then
      -- Same binding, still in flight -- contender waits
      raise exception
        'La operacion ya se esta procesando. Reintentá en unos segundos.'
        using errcode = 'P0009';
    end if;

    -- Different binding on in-flight row
    raise exception
      'La operacion ya fue procesada con otros datos.'
      using errcode = 'P0008';
  end if;

  -- in_flight with expired lease or abandoned: reclaim
  if v_existing.key_state in ('in_flight', 'abandoned')
    and (
      v_existing.lease_expiry <= now()
      or v_existing.lease_token is null
    )
  then
    -- Verify no conflicting mutation_id exists
    if v_existing.mutation_id is distinct from p_mutation_id then
      raise exception
        'La operacion ya fue procesada con otros datos.'
        using errcode = 'P0008';
    end if;

    if v_existing.payload_hash is distinct from p_payload_hash then
      raise exception
        'La operacion ya fue procesada con otros datos.'
        using errcode = 'P0008';
    end if;

    -- Reclaim: assign new lease to the current contender
    update public.planner_idempotency_keys
    set key_state = 'in_flight',
        lease_token = v_lease_token,
        lease_expiry = v_lease_expiry,
        expires_at = v_lease_expiry,
        last_seen_at = now(),
        response_status = 0,
        response_body = jsonb_build_object('__inflight', true)
    where id = v_existing.id;

    return jsonb_build_object(
      'outcome', 'reserved',
      'idempotency_id', v_existing.id,
      'lease_token', v_lease_token,
      'lease_expiry', v_lease_expiry,
      'reclaimed', true
    );
  end if;

  -- Should never reach here
  raise exception 'V2 reservation unexpected state.'
    using errcode = 'XX000';
end;
$$;

revoke all on function public.planner_v2_reserve_idempotency(
  uuid, uuid, text, uuid, text, text, text, text, text, integer
) from public, anon, authenticated;

comment on function public.planner_v2_reserve_idempotency(
  uuid, uuid, text, uuid, text, text, text, text, text, integer
) is 'Integration-owned V2 atomic reservation helper. Not executable by PUBLIC/anon/authenticated.';

-- ============================================================================
-- PART E: V2 private completion helper
-- Completes a row only if lease_token matches and bindings are consistent.
-- ============================================================================

create or replace function public.planner_v2_complete_idempotency(
  p_idempotency_id uuid,
  p_lease_token uuid,
  p_mutation_id text,
  p_payload_hash text,
  p_actor_account_id uuid,
  p_response_status integer,
  p_response_body jsonb,
  p_key_state text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_row public.planner_idempotency_keys%rowtype;
begin
  if p_idempotency_id is null
    or p_lease_token is null
    or p_mutation_id is null
    or p_actor_account_id is null
    or p_response_status is null
  then
    raise exception 'V2 completion requires id, token, mutation, actor and status.'
      using errcode = '42501';
  end if;

  if p_key_state not in ('completed', 'failed_stable') then
    raise exception 'V2 completion target state must be completed or failed_stable.'
      using errcode = '42501';
  end if;

  select *
  into v_row
  from public.planner_idempotency_keys
  where id = p_idempotency_id
  for update;

  if v_row is null then
    raise exception 'V2 idempotency row not found.'
      using errcode = 'XX000';
  end if;

  -- Ownership: lease token must match
  if v_row.lease_token is distinct from p_lease_token then
    raise exception 'V2 lease token mismatch.'
      using errcode = '42501';
  end if;

  -- Binding: mutation_id must match
  if v_row.mutation_id is distinct from p_mutation_id then
    raise exception 'V2 mutation binding mismatch.'
      using errcode = 'P0008';
  end if;

  -- Binding: payload_hash must match
  if v_row.payload_hash is distinct from p_payload_hash then
    raise exception 'V2 payload hash mismatch.'
      using errcode = 'P0008';
  end if;

  -- State: must be in_flight
  if v_row.key_state <> 'in_flight' then
    raise exception 'V2 row already terminal.'
      using errcode = '55000';
  end if;

  update public.planner_idempotency_keys
  set key_state = p_key_state,
      response_status = p_response_status,
      response_body = p_response_body,
      completed_at = now(),
      last_seen_at = now(),
      lease_expiry = null
  where id = p_idempotency_id;
end;
$$;

revoke all on function public.planner_v2_complete_idempotency(
  uuid, uuid, text, text, uuid, integer, jsonb, text
) from public, anon, authenticated;

comment on function public.planner_v2_complete_idempotency(
  uuid, uuid, text, text, uuid, integer, jsonb, text
) is 'Integration-owned V2 atomic completion helper. Not executable by PUBLIC/anon/authenticated.';

-- ============================================================================
-- PART F: V2 private recovery helper
-- For operation-specific RPCs to safely recover after lease expiry.
-- R1 correction (M11-INT01-P2-F04): three-way classification:
--   effect_proven  → reconstruction to completed
--   no_effect_proven → abandoned
--   ambiguous      → fail closed (no state change)
-- ============================================================================

create or replace function public.planner_v2_recover_idempotency(
  p_idempotency_id uuid,
  p_actor_account_id uuid,
  p_actor_person_id uuid,
  p_mutation_id text,
  p_payload_hash text,
  p_effect_evidence jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_row public.planner_idempotency_keys%rowtype;
  v_lease_token uuid;
  v_proven boolean;
  v_no_effect_proven boolean;
  v_ambiguous boolean;
begin
  if p_idempotency_id is null
    or p_actor_account_id is null
    or p_actor_person_id is null
  then
    raise exception 'V2 recovery requires id and actor.'
      using errcode = '42501';
  end if;

  select *
  into v_row
  from public.planner_idempotency_keys
  where id = p_idempotency_id
  for update;

  if v_row is null then
    raise exception 'V2 idempotency row not found.'
      using errcode = 'XX000';
  end if;

  -- Already terminal: return current state
  if v_row.key_state in ('completed', 'failed_stable') then
    return jsonb_build_object(
      'outcome', 'replay',
      'response_status', v_row.response_status,
      'response_body', v_row.response_body,
      'key_state', v_row.key_state
    );
  end if;

  -- Not expired: cannot recover yet
  if v_row.lease_expiry > now() and v_row.lease_token is not null then
    raise exception
      'La operacion ya se esta procesando. Reintentá en unos segundos.'
      using errcode = 'P0009';
  end if;

  -- ── Three-way evidence classification ──

  -- Determine the three boolean flags from evidence
  if p_effect_evidence is null then
    -- No evidence at all → ambiguous
    v_ambiguous := true;
    v_proven := false;
    v_no_effect_proven := false;
  elsif jsonb_typeof(p_effect_evidence) <> 'object' then
    -- Evidence is not an object → ambiguous
    v_ambiguous := true;
    v_proven := false;
    v_no_effect_proven := false;
  else
    -- Read the explicit boolean keys
    v_proven := (p_effect_evidence->>'effect_proven')::boolean;
    v_no_effect_proven := (p_effect_evidence->>'no_effect_proven')::boolean;

    -- Classify: both absent, both present, both false → ambiguous
    -- Valid paths: exactly one is true
    if v_proven is true and v_no_effect_proven is not true then
      v_ambiguous := false;
    elsif v_no_effect_proven is true and v_proven is not true then
      v_ambiguous := false;
    else
      -- Both true, both false, both null/absent, or contradictions
      v_ambiguous := true;
    end if;
  end if;

  -- ── effect_proven: reconstruct → completed ──
  if not v_ambiguous and v_proven then
    update public.planner_idempotency_keys
    set key_state = 'completed',
        response_status = coalesce((p_effect_evidence->>'response_status')::integer, 200),
        response_body = coalesce(p_effect_evidence->'response_body', jsonb_build_object('recovered', true)),
        completed_at = now(),
        recovered_at = now(),
        recovery_evidence = 'effect_proven',
        lease_expiry = null,
        lease_token = null,
        last_seen_at = now()
    where id = p_idempotency_id;

    return jsonb_build_object(
      'outcome', 'replay',
      'response_status', coalesce((p_effect_evidence->>'response_status')::integer, 200),
      'response_body', coalesce(p_effect_evidence->'response_body', jsonb_build_object('recovered', true)),
      'key_state', 'completed',
      'recovered', true
    );
  end if;

  -- ── no_effect_proven: mark abandoned ──
  if not v_ambiguous and v_no_effect_proven then
    if v_row.key_state = 'in_flight' then
      update public.planner_idempotency_keys
      set key_state = 'abandoned',
          lease_token = null,
          lease_expiry = null,
          last_seen_at = now()
      where id = p_idempotency_id;
    end if;

    return jsonb_build_object(
      'outcome', 'abandoned',
      'idempotency_id', v_row.id
    );
  end if;

  -- ── ambiguous: fail closed ──
  -- No state change. Row preserved as in_flight or abandoned.
  -- No reclaim permitted. No replay. No mutation.
  if v_ambiguous then
    raise exception
      'La evidencia de recuperacion es ambigua. No se puede determinar el resultado.'
      using errcode = 'P0010';
  end if;

  -- Already abandoned: permit reclaim
  if v_row.key_state = 'abandoned' then
    v_lease_token := gen_random_uuid();
    update public.planner_idempotency_keys
    set key_state = 'in_flight',
        lease_token = v_lease_token,
        lease_expiry = now() + interval '30 seconds',
        expires_at = now() + interval '30 seconds',
        last_seen_at = now(),
        response_status = 0,
        response_body = jsonb_build_object('__inflight', true)
    where id = p_idempotency_id;

    return jsonb_build_object(
      'outcome', 'reserved',
      'idempotency_id', v_row.id,
      'lease_token', v_lease_token,
      'lease_expiry', now() + interval '30 seconds',
      'reclaimed', true
    );
  end if;

  raise exception 'V2 recovery unexpected state.'
    using errcode = 'XX000';
end;
$$;

revoke all on function public.planner_v2_recover_idempotency(
  uuid, uuid, uuid, text, text, jsonb
) from public, anon, authenticated;

comment on function public.planner_v2_recover_idempotency(
  uuid, uuid, uuid, text, text, jsonb
) is 'Integration-owned V2 recovery helper. Not executable by PUBLIC/anon/authenticated.';

-- ============================================================================
-- PART G: Extend audit_events for personal scope
-- Additive: actor_person_id, scope_type, scope_id; relax household_id NOT NULL.
-- ============================================================================

alter table public.audit_events
  add column if not exists actor_person_id uuid;

alter table public.audit_events
  add column if not exists scope_type text;

alter table public.audit_events
  add column if not exists scope_id uuid;

-- Relax household_id NOT NULL constraint for personal audits
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'audit_events_household_id_not_null'
      and conrelid = 'public.audit_events'::regclass
  ) then
    alter table public.audit_events
      alter column household_id drop not null;
  end if;
end;
$$;

-- If the NOT NULL was implicit (column defined as not null, no explicit constraint name)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'audit_events_household_id_not_null'
      and conrelid = 'public.audit_events'::regclass
  ) then
    alter table public.audit_events
      alter column household_id drop not null;
  end if;
end;
$$;

-- Scope type constraint on audit_events
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'audit_events_scope_type_valid'
      and conrelid = 'public.audit_events'::regclass
  ) then
    alter table public.audit_events
      add constraint audit_events_scope_type_valid
      check (
        scope_type is null
        or scope_type in ('personal', 'household')
      );
  end if;
end;
$$;

-- Check: household_id must be present for household scope, null for personal scope
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'audit_events_scope_consistency'
      and conrelid = 'public.audit_events'::regclass
  ) then
    alter table public.audit_events
      add constraint audit_events_scope_consistency
      check (
        (scope_type = 'household' and household_id is not null)
        or (scope_type = 'personal' and household_id is null)
        or (scope_type is null)
      );
  end if;
end;
$$;

-- Indexes for V2 audit queries
create index if not exists audit_events_person_time_idx
  on public.audit_events (actor_person_id, occurred_at desc)
  where actor_person_id is not null;

create index if not exists audit_events_scope_idx
  on public.audit_events (scope_type, scope_id)
  where scope_type is not null and scope_id is not null;

-- Exactly-once deduplication: partial unique index for Planner V2 mutation identity.
-- Blocks duplicate audit rows for the same (mutation_id, domain, action, aggregate).
-- Only applies when mutation_id is not null (legacy rows are unaffected).
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'audit_events_mutation_identity_uidx'
  ) then
    create unique index audit_events_mutation_identity_uidx
      on public.audit_events (mutation_id, domain, action, aggregate_type, aggregate_id)
      where mutation_id is not null;
  end if;
end;
$$;

-- ============================================================================
-- PART H: Audit helper for personal scope (V2)
-- ============================================================================

create or replace function public.planner_v2_append_audit(
  p_actor_account_id uuid,
  p_actor_person_id uuid,
  p_scope_type text,
  p_scope_id uuid,
  p_domain text,
  p_action text,
  p_aggregate_type text,
  p_aggregate_id uuid,
  p_result text,
  p_actor_membership_id uuid default null,
  p_request_id text default null,
  p_mutation_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_household_id uuid;
  v_audit_id uuid;
begin
  if p_actor_account_id is null
    or p_actor_person_id is null
    or p_scope_type is null
    or p_scope_id is null
    or p_domain is null
    or p_action is null
    or p_aggregate_type is null
    or p_aggregate_id is null
    or p_result is null
  then
    raise exception 'V2 audit requires actor, scope, domain, action, aggregate and result.'
      using errcode = '42501';
  end if;

  if p_scope_type not in ('personal', 'household') then
    raise exception 'V2 audit scope must be personal or household.'
      using errcode = '42501';
  end if;

  v_household_id := case when p_scope_type = 'household' then p_scope_id else null end;

  -- Idempotent insert: if an audit with the same mutation identity already exists,
  -- return its ID without inserting a duplicate.
  if p_mutation_id is not null then
    insert into public.audit_events (
      household_id, actor_membership_id, actor_account_id,
      actor_person_id, scope_type, scope_id,
      domain, action, aggregate_type, aggregate_id,
      result, request_id, mutation_id, metadata_version, metadata
    ) values (
      v_household_id, p_actor_membership_id, p_actor_account_id,
      p_actor_person_id, p_scope_type, p_scope_id,
      p_domain, p_action, p_aggregate_type, p_aggregate_id,
      p_result, p_request_id, p_mutation_id, 1, p_metadata
    )
    on conflict (mutation_id, domain, action, aggregate_type, aggregate_id)
      where mutation_id is not null
    do nothing
    returning id into v_audit_id;

    -- If conflict prevented insert, fetch existing
    if v_audit_id is null then
      select id into v_audit_id
      from public.audit_events
      where mutation_id = p_mutation_id
        and domain = p_domain
        and action = p_action
        and aggregate_type = p_aggregate_type
        and aggregate_id = p_aggregate_id
      limit 1;

      if v_audit_id is null then
        raise exception 'V2 audit dedupe: existing row not found after conflict.'
          using errcode = 'XX000';
      end if;
    end if;

    return v_audit_id;
  end if;

  -- Legacy insert: no mutation_id, no deduplication
  insert into public.audit_events (
    household_id, actor_membership_id, actor_account_id,
    actor_person_id, scope_type, scope_id,
    domain, action, aggregate_type, aggregate_id,
    result, request_id, mutation_id, metadata_version, metadata
  ) values (
    v_household_id, p_actor_membership_id, p_actor_account_id,
    p_actor_person_id, p_scope_type, p_scope_id,
    p_domain, p_action, p_aggregate_type, p_aggregate_id,
    p_result, p_request_id, p_mutation_id, 1, p_metadata
  ) returning id into v_audit_id;

  return v_audit_id;
end;
$$;

revoke all on function public.planner_v2_append_audit(
  uuid, uuid, text, uuid, text, text, text, uuid, text, uuid, text, text, jsonb
) from public, anon, authenticated;

comment on function public.planner_v2_append_audit(
  uuid, uuid, text, uuid, text, text, text, uuid, text, uuid, text, text, jsonb
) is 'Integration-owned V2 audit append helper. Not executable by PUBLIC/anon/authenticated.';

-- ============================================================================
-- PART I: Backfill legacy rows
-- Mark existing rows as household scope with actor_person_id derived from
-- household_members when evidence is sufficient.
-- ============================================================================

do $$
declare
  v_row record;
  v_person_id uuid;
  v_account_id uuid;
  v_completed boolean;
  v_ambiguous_count integer := 0;
  v_backfilled_count integer := 0;
  v_skipped_inflight_count integer := 0;
begin
  for v_row in
    select id, household_id, actor_member_id, response_status,
           response_body, expires_at
    from public.planner_idempotency_keys
    where actor_person_id is null
      or scope_type is null
      or scope_id is null
  loop
    -- Derive actor person and account from membership
    begin
      select hm.person_id, p.auth_user_id
      into v_person_id, v_account_id
      from public.household_members hm
      join public.people p on p.id = hm.person_id
      where hm.id = v_row.actor_member_id
        and hm.household_id = v_row.household_id;
    exception when others then
      v_person_id := null;
      v_account_id := null;
    end;

    -- Only backfill when person/account can be resolved
    if v_person_id is null or v_account_id is null then
      v_ambiguous_count := v_ambiguous_count + 1;
      continue;
    end if;

    -- Determine key_state from legacy response_status
    if v_row.response_status = 0 then
      -- In-flight: check expiry
      if v_row.expires_at < now() then
        -- Expired: mark abandoned
        v_completed := false;
      else
        -- Still active: skip, domain RPCs will reconcile later
        v_skipped_inflight_count := v_skipped_inflight_count + 1;
        continue;
      end if;
    elsif v_row.response_status >= 200 and v_row.response_status < 300 then
      v_completed := true;
    elsif v_row.response_status >= 400 and v_row.response_status < 500 then
      v_completed := true;  -- stored as failed_stable
    else
      v_completed := false;
    end if;

    if v_completed then
      update public.planner_idempotency_keys
      set actor_person_id = v_person_id,
          actor_account_id = v_account_id,
          scope_type = 'household',
          scope_id = v_row.household_id,
          key_state = case
            when v_row.response_status >= 400 then 'failed_stable'
            else 'completed'
          end,
          completed_at = coalesce(completed_at, v_row.expires_at)
      where id = v_row.id;
      v_backfilled_count := v_backfilled_count + 1;
    else
      -- Expired in-flight without evidence: abandoned
      update public.planner_idempotency_keys
      set actor_person_id = v_person_id,
          actor_account_id = v_account_id,
          scope_type = 'household',
          scope_id = v_row.household_id,
          key_state = 'abandoned',
          lease_token = null,
          lease_expiry = null
      where id = v_row.id;
      v_backfilled_count := v_backfilled_count + 1;
    end if;
  end loop;

  raise notice 'M11.INT-01 backfill: % rows backfilled, % ambiguous/unresolvable, % in-flight skipped.',
    v_backfilled_count, v_ambiguous_count, v_skipped_inflight_count;
end;
$$;

-- ============================================================================
-- PART J: Revoke effective DELETE from ordinary client roles
-- Correction M11-INT01-P2-F03: authenticated had effective DELETE.
-- ============================================================================

revoke delete on table public.planner_idempotency_keys
  from public, anon, authenticated;

-- R2 correction (R1-N1): revoke TRUNCATE, REFERENCES, TRIGGER from client roles.
-- TRUNCATE is a mass-DELETE equivalent that RLS cannot restrict.
-- REFERENCES and TRIGGER are unnecessary for client operation.
revoke truncate, references, trigger on table public.planner_idempotency_keys
  from public, anon, authenticated;

-- ============================================================================
-- PART J.1: Grant catalog documentation (Phase 2 R2 state)
-- V2 PRIVATE FOUNDATION: hardened + DELETE revoked + TRUNCATE/REFERENCES/TRIGGER revoked
--    planner_canonical_jsonb_text_v2       PUBLIC=NO, anon=NO, authenticated=NO
--    planner_canonical_request_text_v2     PUBLIC=NO, anon=NO, authenticated=NO
--    planner_canonical_request_hash_v2     PUBLIC=NO, anon=NO, authenticated=NO
--    planner_v2_reserve_idempotency        PUBLIC=NO, anon=NO, authenticated=NO
--    planner_v2_complete_idempotency       PUBLIC=NO, anon=NO, authenticated=NO
--    planner_v2_recover_idempotency        PUBLIC=NO, anon=NO, authenticated=NO
--    planner_v2_append_audit               PUBLIC=NO, anon=NO, authenticated=NO
-- LEGACY PUBLIC SURFACE: temporarily preserved, still pending 20260722090010
--    reserve_planner_idempotency_key      EXECUTE granted to authenticated (legacy)
--    complete_planner_idempotency_key     EXECUTE granted to authenticated (legacy)
--    planner_idempotency_keys             SELECT, INSERT, UPDATE to authenticated (legacy)
--    planner_idempotency_keys             DELETE REVOKED from anon, authenticated (R1 correction)
-- ============================================================================

commit;