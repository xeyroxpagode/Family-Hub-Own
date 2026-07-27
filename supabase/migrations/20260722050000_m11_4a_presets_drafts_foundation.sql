-- M11.4A Presets/Drafts Foundation
-- Owner: Presets/Drafts
-- Range: 20260722050000-20260722059999
-- Scope: presets, preset revisions, private drafts, payload versioning,
--        trash/restore, RLS and lane-owned mutation RPCs.

begin;

create table if not exists public.planner_presets (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('task', 'event', 'plan')),
  source text not null check (source in ('homeplus', 'personal', 'household')),
  owner_person_id uuid references public.people(id) on delete restrict,
  household_id uuid references public.households(id) on delete restrict,
  created_by_person_id uuid references public.people(id) on delete restrict,
  created_by_member_id uuid references public.household_members(id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  active_revision_id uuid,
  version integer not null default 1 check (version >= 1),
  trashed_at timestamptz,
  trashed_from_state jsonb,
  retention_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planner_presets_scope_shape check (
    (source = 'personal' and owner_person_id is not null and household_id is null) or
    (source = 'household' and household_id is not null and owner_person_id is null) or
    (source = 'homeplus' and owner_person_id is null and household_id is null)
  ),
  constraint planner_presets_trash_retention_shape check (
    (trashed_at is null and retention_expires_at is null) or
    (trashed_at is not null and retention_expires_at is not null)
  )
);

create table if not exists public.planner_preset_revisions (
  id uuid primary key default gen_random_uuid(),
  preset_id uuid not null references public.planner_presets(id) on delete cascade,
  revision_number integer not null check (revision_number >= 1),
  revision_state text not null check (revision_state in ('draft', 'published', 'superseded')),
  adapter_key text not null,
  payload_schema text not null check (payload_schema = 'planner.template_payload'),
  payload_version integer not null check (payload_version >= 1),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  structural_fingerprint text not null check (length(structural_fingerprint) >= 32),
  version integer not null default 1 check (version >= 1),
  created_by_person_id uuid references public.people(id) on delete restrict,
  created_by_member_id uuid references public.household_members(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint planner_preset_revisions_publish_shape check (
    (revision_state = 'published' and published_at is not null) or
    (revision_state <> 'published')
  ),
  unique (preset_id, revision_number)
);

alter table public.planner_presets
  drop constraint if exists planner_presets_active_revision_fkey;

alter table public.planner_presets
  add constraint planner_presets_active_revision_fkey
  foreign key (active_revision_id) references public.planner_preset_revisions(id)
  deferrable initially deferred;

create unique index if not exists planner_preset_revisions_one_open_draft_uidx
  on public.planner_preset_revisions (preset_id)
  where revision_state = 'draft';

create index if not exists planner_presets_owner_idx
  on public.planner_presets (owner_person_id, entity_type, updated_at desc)
  where source = 'personal';

create index if not exists planner_presets_household_idx
  on public.planner_presets (household_id, entity_type, updated_at desc)
  where source = 'household';

create index if not exists planner_presets_source_idx
  on public.planner_presets (source, entity_type, updated_at desc);

create index if not exists planner_presets_trash_idx
  on public.planner_presets (retention_expires_at)
  where trashed_at is not null;

create index if not exists planner_preset_revisions_fingerprint_idx
  on public.planner_preset_revisions (preset_id, structural_fingerprint);

create table if not exists public.planner_drafts (
  id uuid primary key default gen_random_uuid(),
  client_draft_key text not null check (length(btrim(client_draft_key)) > 0),
  entity_type text not null check (entity_type in ('task', 'event', 'plan')),
  owner_person_id uuid not null references public.people(id) on delete restrict,
  intended_scope text not null check (intended_scope in ('personal', 'household')),
  intended_household_id uuid references public.households(id) on delete restrict,
  source_preset_id uuid references public.planner_presets(id) on delete set null,
  source_preset_revision_id uuid references public.planner_preset_revisions(id) on delete set null,
  adapter_key text not null,
  payload_schema text not null check (payload_schema = 'planner.template_payload'),
  payload_version integer not null check (payload_version >= 1),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  content_fingerprint text not null check (length(content_fingerprint) >= 32),
  version integer not null default 1 check (version >= 1),
  last_autosaved_at timestamptz not null default now(),
  trashed_at timestamptz,
  trashed_from_state jsonb,
  retention_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planner_drafts_intended_scope_shape check (
    (intended_scope = 'personal' and intended_household_id is null) or
    (intended_scope = 'household' and intended_household_id is not null)
  ),
  constraint planner_drafts_trash_retention_shape check (
    (trashed_at is null and retention_expires_at is null) or
    (trashed_at is not null and retention_expires_at is not null)
  )
);

create unique index if not exists planner_drafts_owner_client_key_uidx
  on public.planner_drafts (owner_person_id, entity_type, client_draft_key);

create index if not exists planner_drafts_owner_idx
  on public.planner_drafts (owner_person_id, entity_type, updated_at desc);

create index if not exists planner_drafts_intended_household_idx
  on public.planner_drafts (intended_household_id, entity_type, updated_at desc)
  where intended_scope = 'household';

create index if not exists planner_drafts_source_preset_idx
  on public.planner_drafts (source_preset_id, source_preset_revision_id);

create index if not exists planner_drafts_fingerprint_idx
  on public.planner_drafts (owner_person_id, content_fingerprint);

create index if not exists planner_drafts_trash_idx
  on public.planner_drafts (retention_expires_at)
  where trashed_at is not null;

drop trigger if exists trg_planner_presets_updated_at on public.planner_presets;
create trigger trg_planner_presets_updated_at
  before update on public.planner_presets
  for each row execute function public.set_updated_at();

drop trigger if exists trg_planner_presets_increment_version on public.planner_presets;
create trigger trg_planner_presets_increment_version
  before update on public.planner_presets
  for each row execute function public.increment_planner_version();

drop trigger if exists trg_planner_preset_revisions_updated_at on public.planner_preset_revisions;
create trigger trg_planner_preset_revisions_updated_at
  before update on public.planner_preset_revisions
  for each row execute function public.set_updated_at();

drop trigger if exists trg_planner_preset_revisions_increment_version on public.planner_preset_revisions;
create trigger trg_planner_preset_revisions_increment_version
  before update on public.planner_preset_revisions
  for each row execute function public.increment_planner_version();

drop trigger if exists trg_planner_drafts_updated_at on public.planner_drafts;
create trigger trg_planner_drafts_updated_at
  before update on public.planner_drafts
  for each row execute function public.set_updated_at();

drop trigger if exists trg_planner_drafts_increment_version on public.planner_drafts;
create trigger trg_planner_drafts_increment_version
  before update on public.planner_drafts
  for each row execute function public.increment_planner_version();

create or replace function public.planner_assert_preset_visible(p_preset public.planner_presets)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    p_preset.source = 'homeplus'
    or (p_preset.source = 'personal' and p_preset.owner_person_id = public.current_person_id())
    or (
      p_preset.source = 'household'
      and public.current_household_member_id(p_preset.household_id) is not null
      and public.planner_current_actor_has_capability(p_preset.household_id, 'planner.view')
      and public.planner_current_actor_has_capability(p_preset.household_id, 'planner.templates.use')
    );
$$;

create or replace function public.planner_assert_preset_mutable(p_preset public.planner_presets)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    p_preset.source <> 'homeplus'
    and (
      (p_preset.source = 'personal' and p_preset.owner_person_id = public.current_person_id())
      or (
        p_preset.source = 'household'
        and public.current_household_member_id(p_preset.household_id) is not null
        and public.planner_current_actor_has_capability(p_preset.household_id, 'planner.view')
        and public.planner_current_actor_has_capability(p_preset.household_id, 'planner.templates.manage')
      )
    );
$$;

alter table public.planner_presets enable row level security;
alter table public.planner_preset_revisions enable row level security;
alter table public.planner_drafts enable row level security;

drop policy if exists planner_presets_select_scope on public.planner_presets;
create policy planner_presets_select_scope on public.planner_presets
  for select using (public.planner_assert_preset_visible(planner_presets));

drop policy if exists planner_preset_revisions_select_scope on public.planner_preset_revisions;
create policy planner_preset_revisions_select_scope on public.planner_preset_revisions
  for select using (
    exists (
      select 1 from public.planner_presets p
      where p.id = planner_preset_revisions.preset_id
        and public.planner_assert_preset_visible(p)
    )
  );

drop policy if exists planner_drafts_owner_select on public.planner_drafts;
create policy planner_drafts_owner_select on public.planner_drafts
  for select using (owner_person_id = public.current_person_id());

-- Public direct writes remain denied. Lane-owned SECURITY DEFINER RPCs below
-- are the only mutation surface, preserving versioning and derived actors.
revoke all on public.planner_presets from public, anon, authenticated;
revoke all on public.planner_preset_revisions from public, anon, authenticated;
revoke all on public.planner_drafts from public, anon, authenticated;
grant select on public.planner_presets to authenticated;
grant select on public.planner_preset_revisions to authenticated;
grant select on public.planner_drafts to authenticated;

create or replace function public.planner_preset_scope_values(p_source text)
returns table(owner_person_id uuid, household_id uuid, created_by_member_id uuid)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_source = 'personal' then
    owner_person_id := public.current_person_id();
    household_id := null;
    created_by_member_id := null;
    return next;
    return;
  end if;

  if p_source = 'household' then
    owner_person_id := null;
    household_id := (select active_household_id from public.people where id = public.current_person_id());
    created_by_member_id := public.current_household_member_id(household_id);
    if household_id is null or created_by_member_id is null then
      raise exception 'member_not_active' using errcode = '42501';
    end if;
    if not public.planner_current_actor_has_capability(household_id, 'planner.templates.manage') then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    return next;
    return;
  end if;

  raise exception 'forbidden' using errcode = '42501';
end;
$$;

create or replace function public.planner_create_preset_v1(
  p_entity_type text,
  p_source text,
  p_name text,
  p_payload_envelope jsonb,
  p_structural_fingerprint text,
  p_request_id text default null,
  p_mutation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_scope record;
  v_preset public.planner_presets;
  v_revision public.planner_preset_revisions;
begin
  select * into v_scope from public.planner_preset_scope_values(p_source);
  insert into public.planner_presets (
    entity_type, source, owner_person_id, household_id,
    created_by_person_id, created_by_member_id, name
  )
  values (
    p_entity_type, p_source, v_scope.owner_person_id, v_scope.household_id,
    public.current_person_id(), v_scope.created_by_member_id, btrim(p_name)
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
    public.current_person_id(),
    v_scope.created_by_member_id,
    now()
  )
  returning * into v_revision;

  update public.planner_presets
     set active_revision_id = v_revision.id
   where id = v_preset.id
  returning * into v_preset;

  perform public.planner_v2_append_audit(
    auth.uid(),
    public.current_person_id(),
    p_source,
    case when p_source = 'personal' then public.current_person_id() else v_preset.household_id end,
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

  return jsonb_build_object('preset', to_jsonb(v_preset), 'revision', to_jsonb(v_revision), 'outcome', 'created');
end;
$$;

create or replace function public.planner_update_preset_metadata_v1(
  p_preset_id uuid,
  p_expected_version integer,
  p_name text,
  p_request_id text default null,
  p_mutation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_preset public.planner_presets;
begin
  select * into v_preset from public.planner_presets where id = p_preset_id for update;
  if v_preset.id is null or not public.planner_assert_preset_mutable(v_preset) then
    raise exception 'not_found' using errcode = '42501';
  end if;
  if v_preset.trashed_at is not null then
    raise exception 'preset_trashed' using errcode = 'P0001';
  end if;
  if v_preset.version <> p_expected_version then
    raise exception 'version_conflict' using errcode = 'P0001';
  end if;
  if btrim(coalesce(p_name, '')) = '' or btrim(p_name) = v_preset.name then
    return jsonb_build_object('preset', to_jsonb(v_preset), 'outcome', 'noop');
  end if;
  update public.planner_presets set name = btrim(p_name) where id = p_preset_id returning * into v_preset;
  return jsonb_build_object('preset', to_jsonb(v_preset), 'outcome', 'updated');
end;
$$;

create or replace function public.planner_start_preset_revision_v1(p_preset_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_preset public.planner_presets;
  v_active public.planner_preset_revisions;
  v_revision public.planner_preset_revisions;
  v_next integer;
begin
  select * into v_preset from public.planner_presets where id = p_preset_id for update;
  if v_preset.id is null or not public.planner_assert_preset_mutable(v_preset) then
    raise exception 'not_found' using errcode = '42501';
  end if;
  if exists (select 1 from public.planner_preset_revisions where preset_id = p_preset_id and revision_state = 'draft') then
    raise exception 'preset_revision_already_open' using errcode = 'P0001';
  end if;
  select * into v_active from public.planner_preset_revisions where id = v_preset.active_revision_id;
  select coalesce(max(revision_number), 0) + 1 into v_next
    from public.planner_preset_revisions where preset_id = p_preset_id;
  insert into public.planner_preset_revisions (
    preset_id, revision_number, revision_state, adapter_key, payload_schema,
    payload_version, payload, structural_fingerprint, created_by_person_id,
    created_by_member_id
  )
  values (
    p_preset_id, v_next, 'draft', v_active.adapter_key, v_active.payload_schema,
    v_active.payload_version, v_active.payload, v_active.structural_fingerprint,
    public.current_person_id(), public.current_household_member_id(v_preset.household_id)
  )
  returning * into v_revision;
  return jsonb_build_object('revision', to_jsonb(v_revision), 'outcome', 'created');
end;
$$;

create or replace function public.planner_update_preset_revision_draft_v1(
  p_revision_id uuid,
  p_expected_version integer,
  p_payload_envelope jsonb,
  p_structural_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_revision public.planner_preset_revisions;
  v_preset public.planner_presets;
begin
  select * into v_revision from public.planner_preset_revisions where id = p_revision_id for update;
  select * into v_preset from public.planner_presets where id = v_revision.preset_id;
  if v_revision.id is null or not public.planner_assert_preset_mutable(v_preset) then
    raise exception 'not_found' using errcode = '42501';
  end if;
  if v_revision.revision_state <> 'draft' then
    raise exception 'preset_revision_not_publishable' using errcode = 'P0001';
  end if;
  if v_revision.version <> p_expected_version then
    raise exception 'version_conflict' using errcode = 'P0001';
  end if;
  if v_revision.structural_fingerprint = p_structural_fingerprint then
    return jsonb_build_object('revision', to_jsonb(v_revision), 'outcome', 'noop');
  end if;
  update public.planner_preset_revisions
     set adapter_key = p_payload_envelope->>'adapter_key',
         payload_schema = p_payload_envelope->>'payload_schema',
         payload_version = (p_payload_envelope->>'payload_version')::integer,
         payload = p_payload_envelope->'payload',
         structural_fingerprint = p_structural_fingerprint
   where id = p_revision_id
  returning * into v_revision;
  return jsonb_build_object('revision', to_jsonb(v_revision), 'outcome', 'updated');
end;
$$;

create or replace function public.planner_publish_preset_revision_v1(
  p_revision_id uuid,
  p_expected_version integer,
  p_request_id text default null,
  p_mutation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_revision public.planner_preset_revisions;
  v_preset public.planner_presets;
begin
  select * into v_revision from public.planner_preset_revisions where id = p_revision_id for update;
  select * into v_preset from public.planner_presets where id = v_revision.preset_id for update;
  if v_revision.id is null or not public.planner_assert_preset_mutable(v_preset) then
    raise exception 'not_found' using errcode = '42501';
  end if;
  if v_preset.trashed_at is not null then
    raise exception 'preset_trashed' using errcode = 'P0001';
  end if;
  if v_revision.revision_state <> 'draft' then
    raise exception 'preset_revision_not_publishable' using errcode = 'P0001';
  end if;
  if v_revision.version <> p_expected_version then
    raise exception 'version_conflict' using errcode = 'P0001';
  end if;
  update public.planner_preset_revisions
     set revision_state = 'superseded'
   where preset_id = v_preset.id and revision_state = 'published';
  update public.planner_preset_revisions
     set revision_state = 'published', published_at = now()
   where id = p_revision_id
  returning * into v_revision;
  update public.planner_presets set active_revision_id = p_revision_id where id = v_preset.id returning * into v_preset;
  perform public.planner_v2_append_audit(
    auth.uid(),
    public.current_person_id(),
    v_preset.source,
    case when v_preset.source = 'personal' then public.current_person_id() else v_preset.household_id end,
    'planner',
    'preset.revision_published',
    'planner_preset',
    v_preset.id,
    'succeeded',
    case when v_preset.source = 'household' then public.current_household_member_id(v_preset.household_id) else null end,
    p_request_id,
    p_mutation_id,
    jsonb_build_object('revision_id', v_revision.id, 'revision_number', v_revision.revision_number)
  );
  return jsonb_build_object('preset', to_jsonb(v_preset), 'revision', to_jsonb(v_revision), 'outcome', 'updated');
end;
$$;

create or replace function public.planner_trash_preset_v1(
  p_preset_id uuid,
  p_expected_version integer,
  p_request_id text default null,
  p_mutation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_preset public.planner_presets;
begin
  select * into v_preset from public.planner_presets where id = p_preset_id for update;
  if v_preset.id is null or not public.planner_assert_preset_mutable(v_preset) then
    raise exception 'not_found' using errcode = '42501';
  end if;
  if v_preset.version <> p_expected_version then
    raise exception 'version_conflict' using errcode = 'P0001';
  end if;
  if v_preset.trashed_at is not null then
    return jsonb_build_object('preset', to_jsonb(v_preset), 'outcome', 'noop');
  end if;
  update public.planner_presets
     set trashed_at = now(),
         trashed_from_state = jsonb_build_object('active_revision_id', active_revision_id),
         retention_expires_at = now() + interval '30 days'
   where id = p_preset_id
  returning * into v_preset;
  perform public.planner_v2_append_audit(
    auth.uid(),
    public.current_person_id(),
    v_preset.source,
    case when v_preset.source = 'personal' then public.current_person_id() else v_preset.household_id end,
    'planner',
    'preset.trashed',
    'planner_preset',
    v_preset.id,
    'succeeded',
    case when v_preset.source = 'household' then public.current_household_member_id(v_preset.household_id) else null end,
    p_request_id,
    p_mutation_id,
    jsonb_build_object('retention_expires_at', v_preset.retention_expires_at)
  );
  return jsonb_build_object('preset', to_jsonb(v_preset), 'outcome', 'updated');
end;
$$;

create or replace function public.planner_restore_preset_v1(
  p_preset_id uuid,
  p_expected_version integer,
  p_request_id text default null,
  p_mutation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_preset public.planner_presets;
begin
  select * into v_preset from public.planner_presets where id = p_preset_id for update;
  if v_preset.id is null or not public.planner_assert_preset_mutable(v_preset) then
    raise exception 'not_found' using errcode = '42501';
  end if;
  if v_preset.version <> p_expected_version then
    raise exception 'version_conflict' using errcode = 'P0001';
  end if;
  if v_preset.trashed_at is null then
    return jsonb_build_object('preset', to_jsonb(v_preset), 'outcome', 'noop');
  end if;
  if v_preset.retention_expires_at < now() then
    raise exception 'restore_window_expired' using errcode = 'P0001';
  end if;
  update public.planner_presets
     set trashed_at = null, trashed_from_state = null, retention_expires_at = null
   where id = p_preset_id
  returning * into v_preset;
  perform public.planner_v2_append_audit(
    auth.uid(),
    public.current_person_id(),
    v_preset.source,
    case when v_preset.source = 'personal' then public.current_person_id() else v_preset.household_id end,
    'planner',
    'preset.restored',
    'planner_preset',
    v_preset.id,
    'succeeded',
    case when v_preset.source = 'household' then public.current_household_member_id(v_preset.household_id) else null end,
    p_request_id,
    p_mutation_id,
    '{}'::jsonb
  );
  return jsonb_build_object('preset', to_jsonb(v_preset), 'outcome', 'updated');
end;
$$;

create or replace function public.planner_autosave_draft_v1(
  p_client_draft_key text,
  p_entity_type text,
  p_intended_scope text,
  p_intended_household_id uuid,
  p_source_preset_id uuid,
  p_source_preset_revision_id uuid,
  p_payload_envelope jsonb,
  p_content_fingerprint text,
  p_expected_version integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_owner uuid := public.current_person_id();
  v_draft public.planner_drafts;
begin
  if v_owner is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_intended_scope = 'household' then
    if public.current_household_member_id(p_intended_household_id) is null then
      raise exception 'member_not_active' using errcode = '42501';
    end if;
  end if;
  select * into v_draft
    from public.planner_drafts
   where owner_person_id = v_owner
     and entity_type = p_entity_type
     and client_draft_key = p_client_draft_key
   for update;
  if v_draft.id is null then
    insert into public.planner_drafts (
      client_draft_key, entity_type, owner_person_id, intended_scope,
      intended_household_id, source_preset_id, source_preset_revision_id,
      adapter_key, payload_schema, payload_version, payload, content_fingerprint
    )
    values (
      p_client_draft_key, p_entity_type, v_owner, p_intended_scope,
      p_intended_household_id, p_source_preset_id, p_source_preset_revision_id,
      p_payload_envelope->>'adapter_key', p_payload_envelope->>'payload_schema',
      (p_payload_envelope->>'payload_version')::integer, p_payload_envelope->'payload',
      p_content_fingerprint
    )
    returning * into v_draft;
    return jsonb_build_object('draft', to_jsonb(v_draft), 'outcome', 'created');
  end if;
  if v_draft.trashed_at is not null then
    raise exception 'draft_trashed' using errcode = 'P0001';
  end if;
  if p_expected_version is not null and v_draft.version <> p_expected_version then
    raise exception 'version_conflict' using errcode = 'P0001';
  end if;
  if v_draft.content_fingerprint = p_content_fingerprint then
    return jsonb_build_object('draft', to_jsonb(v_draft), 'outcome', 'noop');
  end if;
  update public.planner_drafts
     set intended_scope = p_intended_scope,
         intended_household_id = p_intended_household_id,
         source_preset_id = p_source_preset_id,
         source_preset_revision_id = p_source_preset_revision_id,
         adapter_key = p_payload_envelope->>'adapter_key',
         payload_schema = p_payload_envelope->>'payload_schema',
         payload_version = (p_payload_envelope->>'payload_version')::integer,
         payload = p_payload_envelope->'payload',
         content_fingerprint = p_content_fingerprint,
         last_autosaved_at = now()
   where id = v_draft.id
  returning * into v_draft;
  return jsonb_build_object('draft', to_jsonb(v_draft), 'outcome', 'updated');
end;
$$;

create or replace function public.planner_trash_draft_v1(
  p_draft_id uuid,
  p_expected_version integer,
  p_request_id text default null,
  p_mutation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_draft public.planner_drafts;
begin
  select * into v_draft from public.planner_drafts where id = p_draft_id for update;
  if v_draft.id is null or v_draft.owner_person_id <> public.current_person_id() then
    raise exception 'not_found' using errcode = '42501';
  end if;
  if v_draft.version <> p_expected_version then
    raise exception 'version_conflict' using errcode = 'P0001';
  end if;
  if v_draft.trashed_at is not null then
    return jsonb_build_object('draft', to_jsonb(v_draft), 'outcome', 'noop');
  end if;
  update public.planner_drafts
     set trashed_at = now(),
         trashed_from_state = jsonb_build_object('intended_scope', intended_scope),
         retention_expires_at = now() + interval '30 days'
   where id = p_draft_id
  returning * into v_draft;
  perform public.planner_v2_append_audit(
    auth.uid(),
    public.current_person_id(),
    'personal',
    public.current_person_id(),
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
  return jsonb_build_object('draft', to_jsonb(v_draft), 'outcome', 'updated');
end;
$$;

create or replace function public.planner_restore_draft_v1(
  p_draft_id uuid,
  p_expected_version integer,
  p_request_id text default null,
  p_mutation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_draft public.planner_drafts;
begin
  select * into v_draft from public.planner_drafts where id = p_draft_id for update;
  if v_draft.id is null or v_draft.owner_person_id <> public.current_person_id() then
    raise exception 'not_found' using errcode = '42501';
  end if;
  if v_draft.version <> p_expected_version then
    raise exception 'version_conflict' using errcode = 'P0001';
  end if;
  if v_draft.trashed_at is null then
    return jsonb_build_object('draft', to_jsonb(v_draft), 'outcome', 'noop');
  end if;
  if v_draft.retention_expires_at < now() then
    raise exception 'restore_window_expired' using errcode = 'P0001';
  end if;
  update public.planner_drafts
     set trashed_at = null, trashed_from_state = null, retention_expires_at = null
   where id = p_draft_id
  returning * into v_draft;
  perform public.planner_v2_append_audit(
    auth.uid(),
    public.current_person_id(),
    'personal',
    public.current_person_id(),
    'planner',
    'draft.restored',
    'planner_draft',
    v_draft.id,
    'succeeded',
    null,
    p_request_id,
    p_mutation_id,
    '{}'::jsonb
  );
  return jsonb_build_object('draft', to_jsonb(v_draft), 'outcome', 'updated');
end;
$$;

grant execute on function public.planner_create_preset_v1(text, text, text, jsonb, text, text, text) to authenticated;
grant execute on function public.planner_update_preset_metadata_v1(uuid, integer, text, text, text) to authenticated;
grant execute on function public.planner_start_preset_revision_v1(uuid) to authenticated;
grant execute on function public.planner_update_preset_revision_draft_v1(uuid, integer, jsonb, text) to authenticated;
grant execute on function public.planner_publish_preset_revision_v1(uuid, integer, text, text) to authenticated;
grant execute on function public.planner_trash_preset_v1(uuid, integer, text, text) to authenticated;
grant execute on function public.planner_restore_preset_v1(uuid, integer, text, text) to authenticated;
grant execute on function public.planner_autosave_draft_v1(text, text, text, uuid, uuid, uuid, jsonb, text, integer) to authenticated;
grant execute on function public.planner_trash_draft_v1(uuid, integer, text, text) to authenticated;
grant execute on function public.planner_restore_draft_v1(uuid, integer, text, text) to authenticated;

comment on table public.planner_presets is 'Planner V1 reusable presets; executions remain independent from revisions.';
comment on table public.planner_preset_revisions is 'Immutable published preset revisions plus one open draft revision per preset.';
comment on table public.planner_drafts is 'Private owner-only Planner drafts; intended household scope does not publish the draft.';

commit;
