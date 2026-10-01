-- M11 OLA 3 Presets/Drafts atomic replay fix
-- Owner: Integration
-- Scope: operation-specific Shared Mutation Authority consumption for:
--   - planner_create_preset_v1
--   - planner_update_preset_metadata_v1
--   - planner_trash_draft_v1

begin;

drop function if exists public.planner_create_preset_v1(text, text, text, jsonb, text, text, text);
drop function if exists public.planner_update_preset_metadata_v1(uuid, integer, text, text, text);
drop function if exists public.planner_trash_draft_v1(uuid, integer, text, text);

create or replace function public.planner_presets_drafts_v1_complete_idempotency(
  p_reservation jsonb,
  p_mutation_id text,
  p_payload_hash text,
  p_actor_account_id uuid,
  p_response_status integer,
  p_response_body jsonb,
  p_key_state text default 'completed'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform public.planner_v2_complete_idempotency(
    (p_reservation->>'idempotency_id')::uuid,
    (p_reservation->>'lease_token')::uuid,
    p_mutation_id,
    p_payload_hash,
    p_actor_account_id,
    p_response_status,
    p_response_body,
    p_key_state
  );
  return p_response_body;
end;
$$;

revoke all on function public.planner_presets_drafts_v1_complete_idempotency(
  jsonb, text, text, uuid, integer, jsonb, text
) from public, anon, authenticated;

create or replace function public.planner_presets_drafts_v1_assert_mutation_binding(
  p_actor_person_id uuid,
  p_scope_type text,
  p_scope_id uuid,
  p_operation text,
  p_idempotency_key text,
  p_mutation_id text,
  p_payload_hash text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_existing record;
begin
  select idempotency_key, payload_hash
    into v_existing
  from public.planner_idempotency_keys
  where actor_person_id = p_actor_person_id
    and scope_type = p_scope_type
    and scope_id = p_scope_id
    and operation = p_operation
    and mutation_id = p_mutation_id
  limit 1;

  if found and (
    v_existing.idempotency_key is distinct from p_idempotency_key
    or v_existing.payload_hash is distinct from p_payload_hash
  ) then
    raise exception 'La operacion ya fue procesada con otros datos.' using errcode = 'P0008';
  end if;
end;
$$;

revoke all on function public.planner_presets_drafts_v1_assert_mutation_binding(
  uuid, text, uuid, text, text, text, text
) from public, anon, authenticated;

create or replace function public.planner_create_preset_v1(
  p_entity_type text,
  p_source text,
  p_name text,
  p_payload_envelope jsonb,
  p_structural_fingerprint text,
  p_request_id text default null,
  p_mutation_id text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor_account uuid := auth.uid();
  v_actor_person uuid := public.current_person_id();
  v_scope record;
  v_scope_type text;
  v_scope_id uuid;
  v_operation text := 'planner.preset.create.v1';
  v_payload jsonb;
  v_payload_hash text;
  v_reservation jsonb;
  v_response jsonb;
  v_preset public.planner_presets;
  v_revision public.planner_preset_revisions;
begin
  if v_actor_account is null or v_actor_person is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_mutation_id is null or length(btrim(p_mutation_id)) = 0
    or p_idempotency_key is null or length(btrim(p_idempotency_key)) = 0
  then
    raise exception 'idempotency_context_required' using errcode = '42501';
  end if;

  select * into v_scope from public.planner_preset_scope_values(p_source);
  v_scope_type := p_source;
  v_scope_id := case when p_source = 'personal' then v_actor_person else v_scope.household_id end;

  if v_scope_type not in ('personal', 'household') or v_scope_id is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_payload := jsonb_build_object(
    'entity_type', p_entity_type,
    'source', p_source,
    'name', btrim(coalesce(p_name, '')),
    'payload_envelope', p_payload_envelope,
    'structural_fingerprint', p_structural_fingerprint
  );
  v_payload_hash := public.planner_canonical_request_hash_v2(
    v_operation, v_scope_type, v_scope_id, null, v_payload, null, p_mutation_id
  );

  perform public.planner_presets_drafts_v1_assert_mutation_binding(
    v_actor_person, v_scope_type, v_scope_id, v_operation, p_idempotency_key, p_mutation_id, v_payload_hash
  );

  v_reservation := public.planner_v2_reserve_idempotency(
    v_actor_account, v_actor_person, v_scope_type, v_scope_id, v_operation,
    'CREATE_IDEMPOTENT', p_idempotency_key, p_mutation_id, v_payload_hash, 30
  );
  if v_reservation->>'outcome' = 'replay' then
    if v_reservation->>'key_state' = 'failed_stable' then
      return v_reservation->'response_body';
    end if;
    return (v_reservation->'response_body')
      || jsonb_build_object('outcome', 'replay', 'response_status', (v_reservation->>'response_status')::integer);
  end if;

  insert into public.planner_presets (
    entity_type, source, owner_person_id, household_id,
    created_by_person_id, created_by_member_id, name
  )
  values (
    p_entity_type, p_source, v_scope.owner_person_id, v_scope.household_id,
    v_actor_person, v_scope.created_by_member_id, btrim(p_name)
  )
  returning * into v_preset;

  insert into public.planner_preset_revisions (
    preset_id, revision_number, revision_state, adapter_key, payload_schema,
    payload_version, payload, structural_fingerprint, created_by_person_id,
    created_by_member_id, published_at
  )
  values (
    v_preset.id, 1, 'published',
    p_payload_envelope->>'adapter_key',
    p_payload_envelope->>'payload_schema',
    (p_payload_envelope->>'payload_version')::integer,
    p_payload_envelope->'payload',
    p_structural_fingerprint,
    v_actor_person,
    v_scope.created_by_member_id,
    now()
  )
  returning * into v_revision;

  update public.planner_presets
     set active_revision_id = v_revision.id
   where id = v_preset.id
  returning * into v_preset;

  perform public.planner_v2_append_audit(
    v_actor_account,
    v_actor_person,
    v_scope_type,
    v_scope_id,
    'planner',
    'preset.created',
    'planner_preset',
    v_preset.id,
    'succeeded',
    v_scope.created_by_member_id,
    p_request_id,
    p_mutation_id,
    jsonb_build_object('entity_type', p_entity_type, 'source', p_source)
  );

  v_response := jsonb_build_object('preset', to_jsonb(v_preset), 'revision', to_jsonb(v_revision), 'outcome', 'created');
  return public.planner_presets_drafts_v1_complete_idempotency(
    v_reservation, p_mutation_id, v_payload_hash, v_actor_account, 201, v_response, 'completed'
  );
end;
$$;

create or replace function public.planner_update_preset_metadata_v1(
  p_preset_id uuid,
  p_expected_version integer,
  p_name text,
  p_request_id text default null,
  p_mutation_id text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor_account uuid := auth.uid();
  v_actor_person uuid := public.current_person_id();
  v_scope_type text;
  v_scope_id uuid;
  v_actor_member uuid;
  v_operation text := 'planner.preset.metadata.update.v1';
  v_payload jsonb;
  v_payload_hash text;
  v_reservation jsonb;
  v_response jsonb;
  v_preset public.planner_presets;
begin
  if v_actor_account is null or v_actor_person is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_expected_version is null then
    raise exception 'expected_version_required' using errcode = '42501';
  end if;
  if p_mutation_id is null or length(btrim(p_mutation_id)) = 0
    or p_idempotency_key is null or length(btrim(p_idempotency_key)) = 0
  then
    raise exception 'idempotency_context_required' using errcode = '42501';
  end if;

  select * into v_preset from public.planner_presets where id = p_preset_id;
  if v_preset.id is null or not public.planner_assert_preset_mutable(v_preset) then
    raise exception 'not_found' using errcode = '42501';
  end if;

  v_scope_type := v_preset.source;
  v_scope_id := case when v_preset.source = 'personal' then v_actor_person else v_preset.household_id end;
  v_actor_member := case when v_preset.source = 'household' then public.current_household_member_id(v_preset.household_id) else null end;

  v_payload := jsonb_build_object('name', btrim(coalesce(p_name, '')));
  v_payload_hash := public.planner_canonical_request_hash_v2(
    v_operation, v_scope_type, v_scope_id, p_preset_id, v_payload, p_expected_version, p_mutation_id
  );

  perform public.planner_presets_drafts_v1_assert_mutation_binding(
    v_actor_person, v_scope_type, v_scope_id, v_operation, p_idempotency_key, p_mutation_id, v_payload_hash
  );

  v_reservation := public.planner_v2_reserve_idempotency(
    v_actor_account, v_actor_person, v_scope_type, v_scope_id, v_operation,
    'VERSIONED_MUTATION', p_idempotency_key, p_mutation_id, v_payload_hash, 30
  );
  if v_reservation->>'outcome' = 'replay' then
    if v_reservation->>'key_state' = 'failed_stable' then
      return v_reservation->'response_body';
    end if;
    return (v_reservation->'response_body')
      || jsonb_build_object('outcome', 'replay', 'response_status', (v_reservation->>'response_status')::integer);
  end if;

  select * into v_preset from public.planner_presets where id = p_preset_id for update;
  if v_preset.id is null or not public.planner_assert_preset_mutable(v_preset) then
    raise exception 'not_found' using errcode = '42501';
  end if;
  if v_preset.trashed_at is not null then
    v_response := jsonb_build_object('outcome', 'preset_trashed');
    return public.planner_presets_drafts_v1_complete_idempotency(
      v_reservation, p_mutation_id, v_payload_hash, v_actor_account, 409, v_response, 'failed_stable'
    );
  end if;
  if v_preset.version <> p_expected_version then
    v_response := jsonb_build_object('outcome', 'version_conflict', 'current_version', v_preset.version);
    return public.planner_presets_drafts_v1_complete_idempotency(
      v_reservation, p_mutation_id, v_payload_hash, v_actor_account, 412, v_response, 'failed_stable'
    );
  end if;

  if btrim(coalesce(p_name, '')) = '' or btrim(p_name) = v_preset.name then
    v_response := jsonb_build_object('preset', to_jsonb(v_preset), 'outcome', 'noop');
    return public.planner_presets_drafts_v1_complete_idempotency(
      v_reservation, p_mutation_id, v_payload_hash, v_actor_account, 200, v_response, 'completed'
    );
  end if;

  update public.planner_presets
     set name = btrim(p_name)
   where id = p_preset_id
  returning * into v_preset;

  perform public.planner_v2_append_audit(
    v_actor_account,
    v_actor_person,
    v_scope_type,
    v_scope_id,
    'planner',
    'preset.metadata_updated',
    'planner_preset',
    v_preset.id,
    'succeeded',
    v_actor_member,
    p_request_id,
    p_mutation_id,
    jsonb_build_object('fields', jsonb_build_array('name'))
  );

  v_response := jsonb_build_object('preset', to_jsonb(v_preset), 'outcome', 'updated');
  return public.planner_presets_drafts_v1_complete_idempotency(
    v_reservation, p_mutation_id, v_payload_hash, v_actor_account, 200, v_response, 'completed'
  );
end;
$$;

create or replace function public.planner_trash_draft_v1(
  p_draft_id uuid,
  p_expected_version integer,
  p_request_id text default null,
  p_mutation_id text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor_account uuid := auth.uid();
  v_actor_person uuid := public.current_person_id();
  v_scope_type text := 'personal';
  v_scope_id uuid := public.current_person_id();
  v_operation text := 'planner.draft.trash.v1';
  v_payload jsonb := '{}'::jsonb;
  v_payload_hash text;
  v_reservation jsonb;
  v_response jsonb;
  v_draft public.planner_drafts;
begin
  if v_actor_account is null or v_actor_person is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_expected_version is null then
    raise exception 'expected_version_required' using errcode = '42501';
  end if;
  if p_mutation_id is null or length(btrim(p_mutation_id)) = 0
    or p_idempotency_key is null or length(btrim(p_idempotency_key)) = 0
  then
    raise exception 'idempotency_context_required' using errcode = '42501';
  end if;

  select * into v_draft from public.planner_drafts where id = p_draft_id;
  if v_draft.id is null or v_draft.owner_person_id <> v_actor_person then
    raise exception 'not_found' using errcode = '42501';
  end if;

  v_payload_hash := public.planner_canonical_request_hash_v2(
    v_operation, v_scope_type, v_scope_id, p_draft_id, v_payload, p_expected_version, p_mutation_id
  );

  perform public.planner_presets_drafts_v1_assert_mutation_binding(
    v_actor_person, v_scope_type, v_scope_id, v_operation, p_idempotency_key, p_mutation_id, v_payload_hash
  );

  v_reservation := public.planner_v2_reserve_idempotency(
    v_actor_account, v_actor_person, v_scope_type, v_scope_id, v_operation,
    'VERSIONED_MUTATION', p_idempotency_key, p_mutation_id, v_payload_hash, 30
  );
  if v_reservation->>'outcome' = 'replay' then
    if v_reservation->>'key_state' = 'failed_stable' then
      return v_reservation->'response_body';
    end if;
    return (v_reservation->'response_body')
      || jsonb_build_object('outcome', 'replay', 'response_status', (v_reservation->>'response_status')::integer);
  end if;

  select * into v_draft from public.planner_drafts where id = p_draft_id for update;
  if v_draft.id is null or v_draft.owner_person_id <> v_actor_person then
    raise exception 'not_found' using errcode = '42501';
  end if;
  if v_draft.version <> p_expected_version then
    v_response := jsonb_build_object('outcome', 'version_conflict', 'current_version', v_draft.version);
    return public.planner_presets_drafts_v1_complete_idempotency(
      v_reservation, p_mutation_id, v_payload_hash, v_actor_account, 412, v_response, 'failed_stable'
    );
  end if;
  if v_draft.trashed_at is not null then
    v_response := jsonb_build_object('draft', to_jsonb(v_draft), 'outcome', 'noop');
    return public.planner_presets_drafts_v1_complete_idempotency(
      v_reservation, p_mutation_id, v_payload_hash, v_actor_account, 200, v_response, 'completed'
    );
  end if;

  update public.planner_drafts
     set trashed_at = now(),
         trashed_from_state = jsonb_build_object('intended_scope', intended_scope),
         retention_expires_at = now() + interval '30 days'
   where id = p_draft_id
  returning * into v_draft;

  perform public.planner_v2_append_audit(
    v_actor_account,
    v_actor_person,
    v_scope_type,
    v_scope_id,
    'planner',
    'draft.trashed',
    'planner_draft',
    v_draft.id,
    'succeeded',
    null,
    p_request_id,
    p_mutation_id,
    jsonb_build_object('intended_scope', v_draft.intended_scope)
  );

  v_response := jsonb_build_object('draft', to_jsonb(v_draft), 'outcome', 'updated');
  return public.planner_presets_drafts_v1_complete_idempotency(
    v_reservation, p_mutation_id, v_payload_hash, v_actor_account, 200, v_response, 'completed'
  );
end;
$$;

revoke all on function public.planner_create_preset_v1(
  text, text, text, jsonb, text, text, text, text
) from public, anon;
revoke all on function public.planner_update_preset_metadata_v1(
  uuid, integer, text, text, text, text
) from public, anon;
revoke all on function public.planner_trash_draft_v1(
  uuid, integer, text, text, text
) from public, anon;

grant execute on function public.planner_create_preset_v1(
  text, text, text, jsonb, text, text, text, text
) to authenticated;
grant execute on function public.planner_update_preset_metadata_v1(
  uuid, integer, text, text, text, text
) to authenticated;
grant execute on function public.planner_trash_draft_v1(
  uuid, integer, text, text, text
) to authenticated;

comment on function public.planner_create_preset_v1(
  text, text, text, jsonb, text, text, text, text
) is 'Integration R1 correction: atomic create Preset mutation with Shared Mutation Authority replay.';
comment on function public.planner_update_preset_metadata_v1(
  uuid, integer, text, text, text, text
) is 'Integration R1 correction: atomic update Preset metadata mutation with Shared Mutation Authority replay before version check.';
comment on function public.planner_trash_draft_v1(
  uuid, integer, text, text, text
) is 'Integration R1 correction: atomic trash Draft mutation with Shared Mutation Authority replay before version check.';

commit;
