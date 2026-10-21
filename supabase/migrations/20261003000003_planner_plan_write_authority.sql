-- Plans · R4b — single server-authorized write authority for the Plan root.
--
-- Authority: PLANS_TECHNICAL_TRUTH_V1 §2 (final root shape), §2.2 (ownership),
-- §2.3 (durable authorship), §3 (legacy root fields), §4 (lifecycle), §5
-- (archive is not lifecycle), §6 (trash), §15 (authorization), §17 (a
-- relationship never widens visibility), §22 (versioning + idempotency),
-- §26 (data migration policy), §35 (decision register).
--
-- This migration is the R4 writer/cutover slice. It is additive except for the
-- grant cutover, and it contains NO `drop table`, NO `drop column` and NO data
-- deletion.
--
-- What it does, in order:
--   1. Closes the JS/SQL capability gap for the `goal.*` namespace. The SQL
--      capability projection only knew `goal.restore`; every other `goal.*`
--      capability fell through to `else false`, so an RPC could not have
--      authorized a Plan write without denying every role. The matrix mirrors
--      `backend/src/lib/plannerCapabilities.js` DEFAULT_CAPABILITY_MATRIX
--      exactly — no role default is redesigned here, only replicated.
--   2. Resolves Personal ownership from durable evidence, moves Personal Plans
--      out of the household, and then enforces the owner-shape CHECK
--      (Technical Truth §2.2). Unresolvable Personal rows abort the migration
--      (DATA BLOCKER, §26: never infer an owner).
--   3. Installs the small Plan writers: create / update / transition, and
--      adapts the existing `trash_goal_rpc` / `restore_goal_rpc` in place so
--      the R4a hardening (auth.uid-derived actor, `goal.restore` capability,
--      anti-spoofing, `anon` EXECUTE = false) is preserved rather than
--      duplicated in new symmetric RPCs.
--   4. Cuts the write boundary over: `anon` keeps no privilege, `authenticated`
--      keeps SELECT only, direct INSERT/UPDATE/DELETE policies are dropped and
--      replaced by the RPC writers.

-- ===========================================================================
-- 0. Capability parity — `goal.*` in the SQL projection
-- ===========================================================================
--
-- `public.planner_current_actor_has_capability` is the SQL twin of the JS
-- capability matrix. Before this migration its `case` only covered
-- `planner.view`, `task.*`, `goal.restore` and `planner.templates.*`, so
-- `goal.create_personal`, `goal.create_household`, `goal.edit_own`,
-- `goal.edit_any`, `goal.complete_own`, `goal.complete_any`, `goal.close_own`
-- and `goal.close_any` all resolved to `false` for every role. The Plan writers
-- could not have authorized anything.
--
-- The rows below are a literal transcription of DEFAULT_CAPABILITY_MATRIX in
-- `backend/src/lib/plannerCapabilities.js` for the `goal.*` namespace. The
-- household-config override (`config.permissions[capability][role]`) is read
-- before the `case`, exactly as before, so a household can still narrow or widen
-- a grant. `goal.manage_participants` is intentionally absent: it is not part
-- of the final Plans contract (Technical Truth §1.3).

create or replace function public.planner_current_actor_has_capability(
  p_household_id uuid,
  p_capability text
)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_role text;
  v_config jsonb;
  v_configured jsonb;
begin
  select hm.role, h.config
  into v_role, v_config
  from public.household_members hm
  join public.households h on h.id = hm.household_id
  where hm.household_id = p_household_id
    and hm.person_id = public.current_person_id()
    and hm.status = 'active'
  limit 1;

  if v_role is null then
    return false;
  end if;

  v_configured := v_config -> 'permissions' -> p_capability -> v_role;
  if jsonb_typeof(v_configured) = 'boolean' then
    return (v_configured #>> '{}')::boolean;
  end if;

  return case p_capability
    when 'planner.view' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'task.create_household' then v_role in ('coordinator', 'adult', 'adolescent', 'senior')
    when 'task.complete_assigned' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'task.complete_unassigned' then v_role = 'coordinator'
    when 'task.complete_any' then v_role = 'coordinator'
    when 'task.verify' then v_role in ('coordinator', 'adult', 'senior')
    when 'task.edit_own' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'task.edit_any' then v_role in ('coordinator', 'adult', 'senior')
    when 'task.cancel_own' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'task.cancel_any' then v_role in ('coordinator', 'adult', 'senior')
    when 'task.restore' then v_role in ('coordinator', 'adult', 'senior', 'adolescent', 'child')
    -- Plan root (`goal.*`) — mirrors DEFAULT_CAPABILITY_MATRIX.
    -- `goal.archive` stays denied for every role: archive is reserved in V0 and
    -- is not part of this slice (Technical Truth §5).
    when 'goal.create_household' then v_role in ('coordinator', 'adult', 'adolescent', 'senior')
    when 'goal.create_personal' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior')
    when 'goal.edit_own' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'goal.edit_any' then v_role in ('coordinator', 'adult', 'senior')
    when 'goal.complete_own' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'goal.complete_any' then v_role in ('coordinator', 'adult', 'senior')
    when 'goal.close_own' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior', 'guest')
    when 'goal.close_any' then v_role in ('coordinator', 'adult', 'senior')
    when 'goal.archive' then false
    when 'goal.restore' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior')
    -- P2.2A: canonical templates grants (mirror of the JS capability matrix).
    when 'planner.templates.use' then v_role in ('coordinator', 'adult', 'adolescent', 'child', 'senior')
    when 'planner.templates.manage' then v_role = 'coordinator'
    else false
  end;
end;
$$;

revoke all on function public.planner_current_actor_has_capability(uuid, text)
  from public, anon;
grant execute on function public.planner_current_actor_has_capability(uuid, text)
  to authenticated, service_role;

-- ===========================================================================
-- 1. Read authority — one visibility predicate for RLS and for the helpers
-- ===========================================================================
--
-- Personal/Hogar visibility after this migration:
--   * a Personal Plan is visible only to its owner (`owner_person_id`), and it
--     carries no household at all;
--   * a Hogar Plan is visible to any active member of its household that holds
--     `planner.view`.
--
-- This is the single predicate used by the SELECT policy, by
-- `can_select_planner_goal` and by `can_update_planner_goal`, so the two read
-- helpers can no longer disagree with RLS (the defect R4a fixed for the trash
-- filter, generalized to the ownership shape).

create or replace function public.planner_goal_is_visible(
  p_visibility text,
  p_owner_person_id uuid,
  p_household_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case
    when p_visibility = 'personal'
      then p_owner_person_id is not null
       and p_owner_person_id = public.current_person_id()
    when p_visibility = 'household'
      then public.is_active_household_member(p_household_id)
       and public.planner_current_actor_has_capability(p_household_id, 'planner.view')
    else false
  end
$$;

comment on function public.planner_goal_is_visible(text, uuid, uuid) is
  'Single Plan read predicate: Personal is owner-only, Hogar is active membership plus planner.view. Used by RLS and by can_select/can_update_planner_goal.';

revoke all on function public.planner_goal_is_visible(text, uuid, uuid)
  from public, anon;
grant execute on function public.planner_goal_is_visible(text, uuid, uuid)
  to authenticated, service_role;

create or replace function public.can_select_planner_goal(p_goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.planner_goals g
    where g.id = p_goal_id
      and g.deleted_at is null
      and g.trashed_at is null
      and public.planner_goal_is_visible(g.visibility, g.owner_person_id, g.household_id)
  )
$$;

create or replace function public.can_update_planner_goal(p_goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.planner_goals g
    where g.id = p_goal_id
      and g.deleted_at is null
      and g.trashed_at is null
      and public.planner_goal_is_visible(g.visibility, g.owner_person_id, g.household_id)
  )
$$;

revoke all on function public.can_select_planner_goal(uuid) from public, anon;
revoke all on function public.can_update_planner_goal(uuid) from public, anon;
grant execute on function public.can_select_planner_goal(uuid) to authenticated, service_role;
grant execute on function public.can_update_planner_goal(uuid) to authenticated, service_role;

-- ===========================================================================
-- 2. Personal ownership, resolved from durable evidence
-- ===========================================================================
--
-- Technical Truth §2.2 / §26:
--   personal -> owner_person_id IS NOT NULL and household_id IS NULL
--   household -> household_id IS NOT NULL and owner_person_id IS NULL
--
-- Owner resolution uses ONLY an existing identity edge
-- (`created_by_member_id -> household_members.person_id`, already materialized
-- as `created_by_person_id` by the R3 foundation). No owner is ever guessed.
-- If any Personal row still has no durable author, the migration aborts so the
-- row can be reviewed by a human instead of being silently assigned.

do $$
declare
  v_unresolved integer;
begin
  update public.planner_goals g
  set owner_person_id = g.created_by_person_id
  where g.visibility = 'personal'
    and g.owner_person_id is null
    and g.created_by_person_id is not null;

  select count(*) into v_unresolved
  from public.planner_goals
  where visibility = 'personal'
    and owner_person_id is null;

  if v_unresolved > 0 then
    raise exception
      'DATA BLOCKER: % Personal Plan(s) have no durable author to resolve owner_person_id from. Manual review required (Technical Truth §26).',
      v_unresolved;
  end if;
end;
$$;

-- A Personal Plan no longer belongs to a household.
update public.planner_goals
set household_id = null
where visibility = 'personal'
  and household_id is not null;

-- Hogar Plans never carry a person owner.
update public.planner_goals
set owner_person_id = null
where visibility = 'household'
  and owner_person_id is not null;

alter table public.planner_goals
  drop constraint if exists planner_goals_owner_shape;

alter table public.planner_goals
  add constraint planner_goals_owner_shape check (
    (visibility = 'personal'  and owner_person_id is not null and household_id is null)
    or
    (visibility = 'household' and household_id is not null and owner_person_id is null)
  );

comment on constraint planner_goals_owner_shape on public.planner_goals is
  'Personal Plan: owner_person_id set, no household. Hogar Plan: household set, no person owner (Technical Truth §2.2).';

-- Durable authorship is part of the final root shape (§2.3). Every pre-existing
-- row was resolved in the R3 foundation, so this can be validated now.
alter table public.planner_goals
  drop constraint if exists planner_goals_created_by_person_shape;

alter table public.planner_goals
  add constraint planner_goals_created_by_person_shape check (
    created_by_person_id is not null
  );

-- ===========================================================================
-- 3. Actor derivation
-- ===========================================================================
--
-- Every Plan writer derives its actor from `auth.uid()` and never from a
-- client-supplied person/member id. `p_context_household_id` is a SCOPE
-- reference, not an identity: it must be a household the actor is an ACTIVE
-- member of, and the role used for the capability check is read from that
-- membership, never from the request.

create or replace function public.planner_goal_actor_context(p_context_household_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_person_id uuid;
  v_member_id uuid;
begin
  v_person_id := public.current_person_id();
  if v_person_id is null then
    raise exception 'authenticated actor required' using errcode = '42501';
  end if;

  if p_context_household_id is null
     or not public.is_active_household_member(p_context_household_id) then
    raise exception 'authenticated actor required' using errcode = '42501';
  end if;

  v_member_id := public.current_household_member_id(p_context_household_id);

  return jsonb_build_object(
    'person_id', v_person_id,
    'member_id', v_member_id,
    'household_id', p_context_household_id
  );
end;
$$;

comment on function public.planner_goal_actor_context(uuid) is
  'Derives the Plan write actor (person + membership) from auth.uid(). Raises 42501 when there is no real authenticated actor in the given household context.';

revoke all on function public.planner_goal_actor_context(uuid) from public, anon;
grant execute on function public.planner_goal_actor_context(uuid) to authenticated, service_role;

-- Ownership check shared by the writers: is the actor the owner of this Plan?
-- Personal -> owner_person_id; Hogar -> the membership that authored it.
create or replace function public.planner_goal_actor_is_owner(
  p_visibility text,
  p_owner_person_id uuid,
  p_created_by_member_id uuid,
  p_person_id uuid,
  p_member_id uuid
)
returns boolean
language sql
immutable
as $$
  select case
    when p_visibility = 'personal' then p_owner_person_id = p_person_id
    else p_created_by_member_id is not null and p_created_by_member_id = p_member_id
  end
$$;

revoke all on function public.planner_goal_actor_is_owner(text, uuid, uuid, uuid, uuid)
  from public, anon;
grant execute on function public.planner_goal_actor_is_owner(text, uuid, uuid, uuid, uuid)
  to authenticated, service_role;

-- ===========================================================================
-- 4. create_goal_rpc — the Plan create writer
-- ===========================================================================
--
-- Produces exactly two shapes (Technical Truth §2.2):
--
--   personal : visibility='personal',  owner_person_id=<actor person>,
--              household_id=NULL, created_by_member_id=NULL
--   household: visibility='household', owner_person_id=NULL,
--              household_id=<validated context household>, created_by_member_id=<actor member>
--
-- `created_by_person_id` is the actor person in both shapes (§2.3).
-- Create always produces `lifecycle='preparation'` (§4.1).
--
-- The legacy root columns (`category`, `progress_mode`, `target_type`,
-- `current_value`, `target_value`, `unit`, `starts_at`) are neither read nor
-- required: the writer does not depend on them, it only leaves them at their
-- column defaults so pre-existing NOT NULL columns keep satisfying their
-- constraints during the cutover (§3). `ends_at` receives `target_date` purely
-- as a compatibility projection for the legacy Goals reader; it is not part of
-- the Plan contract.
--
-- No idempotency key is accepted here on purpose: the proven
-- `planner_idempotency_keys` reserve/complete pair already wraps this writer at
-- the API boundary and stays the single idempotency authority (§22).

create or replace function public.create_goal_rpc(
  p_visibility text,
  p_title text,
  p_description text default null,
  p_target_date date default null,
  p_context_household_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor jsonb;
  v_person_id uuid;
  v_member_id uuid;
  v_household_id uuid;
  v_capability text;
  v_is_personal boolean;
  v_row public.planner_goals%rowtype;
begin
  if p_visibility is null or p_visibility not in ('personal', 'household') then
    raise exception 'visibility must be personal or household' using errcode = '22023';
  end if;

  if p_title is null or length(btrim(p_title)) = 0 then
    raise exception 'title is required' using errcode = '22023';
  end if;

  v_is_personal := p_visibility = 'personal';

  v_actor := public.planner_goal_actor_context(p_context_household_id);
  v_person_id := (v_actor ->> 'person_id')::uuid;
  v_member_id := (v_actor ->> 'member_id')::uuid;
  v_household_id := (v_actor ->> 'household_id')::uuid;

  v_capability := case
    when v_is_personal then 'goal.create_personal'
    else 'goal.create_household'
  end;

  if not public.planner_current_actor_has_capability(v_household_id, v_capability) then
    raise exception 'goal create forbidden' using errcode = '42501';
  end if;

  insert into public.planner_goals (
    household_id,
    title,
    description,
    visibility,
    owner_person_id,
    created_by_person_id,
    created_by_member_id,
    target_date,
    ends_at,
    lifecycle
  ) values (
    case when v_is_personal then null else v_household_id end,
    btrim(p_title),
    nullif(btrim(coalesce(p_description, '')), ''),
    p_visibility,
    case when v_is_personal then v_person_id else null end,
    v_person_id,
    case when v_is_personal then null else v_member_id end,
    p_target_date,
    p_target_date,
    'preparation'
  )
  returning * into v_row;

  return jsonb_build_object('success', true, 'goal', to_jsonb(v_row));
end;
$$;

comment on function public.create_goal_rpc(text, text, text, date, uuid) is
  'Plan create writer. Derives the actor from auth.uid(), enforces the Personal/Hogar owner shape and authorizes with goal.create_personal / goal.create_household.';

revoke all on function public.create_goal_rpc(text, text, text, date, uuid) from public, anon;
grant execute on function public.create_goal_rpc(text, text, text, date, uuid) to authenticated;

-- ===========================================================================
-- 5. update_goal_rpc — the Plan update writer
-- ===========================================================================
--
-- The writable surface is exactly the current Plan fields: title, description
-- and target_date (§19). `visibility`, `owner_person_id`, `household_id`,
-- `created_by_person_id` and `created_by_member_id` are not parameters of this
-- function, so scope and authorship are IMMUTABLE in V1 by construction — not
-- by a check that could be forgotten.
--
-- Authorization is `goal.edit_own` for the owner and `goal.edit_any` for
-- anybody else who can see the Plan.

create or replace function public.update_goal_rpc(
  p_goal_id uuid,
  p_expected_version integer default null,
  p_context_household_id uuid default null,
  p_title text default null,
  p_description text default null,
  p_target_date date default null,
  p_set_title boolean default false,
  p_set_description boolean default false,
  p_set_target_date boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor jsonb;
  v_person_id uuid;
  v_member_id uuid;
  v_household_id uuid;
  v_is_owner boolean;
  v_goal public.planner_goals%rowtype;
begin
  v_actor := public.planner_goal_actor_context(p_context_household_id);
  v_person_id := (v_actor ->> 'person_id')::uuid;
  v_member_id := (v_actor ->> 'member_id')::uuid;
  v_household_id := (v_actor ->> 'household_id')::uuid;

  select * into v_goal
  from public.planner_goals
  where id = p_goal_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'goal_not_found');
  end if;

  if v_goal.deleted_at is not null or v_goal.trashed_at is not null then
    return jsonb_build_object('success', false, 'error', 'goal_not_found');
  end if;

  if not public.planner_goal_is_visible(v_goal.visibility, v_goal.owner_person_id, v_goal.household_id) then
    raise exception 'goal edit forbidden' using errcode = '42501';
  end if;

  v_is_owner := public.planner_goal_actor_is_owner(
    v_goal.visibility, v_goal.owner_person_id, v_goal.created_by_member_id, v_person_id, v_member_id
  );

  if not public.planner_current_actor_has_capability(
    v_household_id,
    case when v_is_owner then 'goal.edit_own' else 'goal.edit_any' end
  ) then
    raise exception 'goal edit forbidden' using errcode = '42501';
  end if;

  if p_expected_version is not null and v_goal.version <> p_expected_version then
    raise exception 'goal version conflict' using errcode = '40007';
  end if;

  if p_set_title then
    if p_title is null or length(btrim(p_title)) = 0 then
      raise exception 'title is required' using errcode = '22023';
    end if;
    v_goal.title := btrim(p_title);
  end if;

  if p_set_description then
    v_goal.description := nullif(btrim(coalesce(p_description, '')), '');
  end if;

  if p_set_target_date then
    v_goal.target_date := p_target_date;
    -- Compatibility projection for the legacy Goals reader only (§3).
    v_goal.ends_at := p_target_date;
  end if;

  if p_set_title or p_set_description or p_set_target_date then
    update public.planner_goals
    set title = v_goal.title,
        description = v_goal.description,
        target_date = v_goal.target_date,
        ends_at = v_goal.ends_at
    where id = p_goal_id
    returning * into v_goal;
  end if;

  return jsonb_build_object('success', true, 'goal', to_jsonb(v_goal));
end;
$$;

comment on function public.update_goal_rpc(uuid, integer, uuid, text, text, date, boolean, boolean, boolean) is
  'Plan update writer. Writable surface is title/description/target_date only; scope and authorship are immutable because they are not parameters.';

revoke all on function public.update_goal_rpc(uuid, integer, uuid, text, text, date, boolean, boolean, boolean)
  from public, anon;
grant execute on function public.update_goal_rpc(uuid, integer, uuid, text, text, date, boolean, boolean, boolean)
  to authenticated;

-- ===========================================================================
-- 6. transition_goal_rpc — the lifecycle writer
-- ===========================================================================
--
-- Exactly the state machine of Technical Truth §4:
--
--   preparation        -> active            ('activate')
--   active             -> paused            ('pause')
--   paused             -> active            ('resume')
--   active | paused    -> completed         ('complete')
--   preparation|active|paused -> cancelled  ('cancel')
--   completed|cancelled-> active            ('reopen')
--
-- `draft`, `closed`, `failed`, `blocked`, `review` and `trash` are never
-- persisted as a lifecycle value by this writer. `goal.close_*` survives only as
-- the capability name that authorizes `cancel`/`reopen`, exactly as §4.6 allows.
--
-- There is NO child cascade: completing or cancelling a Plan never touches
-- Tasks, Events, Measurements or Milestones. Readiness (§13) is not computed
-- here; that is a later slice.
--
-- `'archive'` / `'unarchive'` are carried over unchanged from the pre-existing
-- Plan endpoint only because the grant cutover in section 8 removes direct
-- UPDATE: they keep the same guard (terminal lifecycle only), only touch
-- `archived_at`, and never change `lifecycle`. Archive is NOT redesigned here.

create or replace function public.transition_goal_rpc(
  p_goal_id uuid,
  p_transition text,
  p_expected_version integer default null,
  p_context_household_id uuid default null,
  p_closed_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor jsonb;
  v_person_id uuid;
  v_member_id uuid;
  v_household_id uuid;
  v_is_owner boolean;
  v_capability text;
  v_goal public.planner_goals%rowtype;
  v_from text;
  v_now timestamptz := now();
begin
  v_actor := public.planner_goal_actor_context(p_context_household_id);
  v_person_id := (v_actor ->> 'person_id')::uuid;
  v_member_id := (v_actor ->> 'member_id')::uuid;
  v_household_id := (v_actor ->> 'household_id')::uuid;

  select * into v_goal
  from public.planner_goals
  where id = p_goal_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'goal_not_found');
  end if;

  if v_goal.deleted_at is not null or v_goal.trashed_at is not null then
    return jsonb_build_object('success', false, 'error', 'goal_not_found');
  end if;

  if not public.planner_goal_is_visible(v_goal.visibility, v_goal.owner_person_id, v_goal.household_id) then
    raise exception 'goal transition forbidden' using errcode = '42501';
  end if;

  v_is_owner := public.planner_goal_actor_is_owner(
    v_goal.visibility, v_goal.owner_person_id, v_goal.created_by_member_id, v_person_id, v_member_id
  );

  v_from := v_goal.lifecycle;

  -- Resolve the capability that authorizes the requested transition. The target
  -- state itself is decided by the state-machine validation further down, so
  -- nothing is mutated before both the capability and the transition are proven.
  case p_transition
    when 'activate' then
      v_capability := case when v_is_owner then 'goal.edit_own' else 'goal.edit_any' end;
    when 'pause' then
      v_capability := case when v_is_owner then 'goal.edit_own' else 'goal.edit_any' end;
    when 'resume' then
      v_capability := case when v_is_owner then 'goal.edit_own' else 'goal.edit_any' end;
    when 'complete' then
      v_capability := case when v_is_owner then 'goal.complete_own' else 'goal.complete_any' end;
    when 'cancel', 'reopen' then
      v_capability := case when v_is_owner then 'goal.close_own' else 'goal.close_any' end;
    when 'archive', 'unarchive' then
      v_capability := 'goal.archive';
    else
      return jsonb_build_object('success', false, 'error', 'invalid_transition');
  end case;

  if not public.planner_current_actor_has_capability(v_household_id, v_capability) then
    raise exception 'goal transition forbidden' using errcode = '42501';
  end if;

  if p_expected_version is not null and v_goal.version <> p_expected_version then
    raise exception 'goal version conflict' using errcode = '40007';
  end if;

  -- Validate the state machine. `status` is never assigned here: the existing
  -- `planner_goals_sync_status_from_lifecycle` trigger keeps it as a derived
  -- projection of `lifecycle`, so it cannot become a second authority (§4).
  case p_transition
    when 'activate' then
      if v_from <> 'preparation' then
        return jsonb_build_object('success', false, 'error', 'invalid_lifecycle_transition');
      end if;
    when 'pause' then
      if v_from <> 'active' then
        return jsonb_build_object('success', false, 'error', 'invalid_lifecycle_transition');
      end if;
    when 'resume' then
      if v_from <> 'paused' then
        return jsonb_build_object('success', false, 'error', 'invalid_lifecycle_transition');
      end if;
    when 'complete' then
      if v_from not in ('active', 'paused') then
        return jsonb_build_object('success', false, 'error', 'invalid_lifecycle_transition');
      end if;
    when 'cancel' then
      if v_from not in ('preparation', 'active', 'paused') then
        return jsonb_build_object('success', false, 'error', 'invalid_lifecycle_transition');
      end if;
    when 'reopen' then
      if v_from not in ('completed', 'cancelled') then
        return jsonb_build_object('success', false, 'error', 'invalid_lifecycle_transition');
      end if;
    when 'archive' then
      if v_from not in ('completed', 'cancelled') then
        return jsonb_build_object('success', false, 'error', 'invalid_archive_transition');
      end if;
    when 'unarchive' then
      if v_goal.archived_at is null then
        return jsonb_build_object('success', false, 'error', 'invalid_unarchive_transition');
      end if;
  end case;

  case p_transition
    when 'activate' then
      update public.planner_goals
      set lifecycle = 'active', activated_at = coalesce(activated_at, v_now)
      where id = p_goal_id
      returning * into v_goal;

    when 'pause' then
      update public.planner_goals
      set lifecycle = 'paused', paused_at = v_now
      where id = p_goal_id
      returning * into v_goal;

    when 'resume' then
      update public.planner_goals
      set lifecycle = 'active'
      where id = p_goal_id
      returning * into v_goal;

    when 'complete' then
      update public.planner_goals
      set lifecycle = 'completed', completed_at = v_now
      where id = p_goal_id
      returning * into v_goal;

    when 'cancel' then
      update public.planner_goals
      set lifecycle = 'cancelled',
          closed_at = v_now,
          closed_reason = nullif(btrim(coalesce(p_closed_reason, '')), '')
      where id = p_goal_id
      returning * into v_goal;

    when 'reopen' then
      -- Clears the terminal metadata that no longer applies. `archived_at` is
      -- deliberately preserved: reopening never un-archives silently (§5).
      update public.planner_goals
      set lifecycle = 'active',
          completed_at = null,
          closed_at = null,
          closed_reason = null
      where id = p_goal_id
      returning * into v_goal;

    when 'archive' then
      update public.planner_goals
      set archived_at = v_now
      where id = p_goal_id
      returning * into v_goal;

    when 'unarchive' then
      update public.planner_goals
      set archived_at = null
      where id = p_goal_id
      returning * into v_goal;
  end case;

  return jsonb_build_object(
    'success', true,
    'goal', to_jsonb(v_goal),
    'from_lifecycle', v_from,
    'to_lifecycle', v_goal.lifecycle
  );
end;
$$;

comment on function public.transition_goal_rpc(uuid, text, integer, uuid, text) is
  'Plan lifecycle writer. preparation/active/paused/completed/cancelled only; no child cascade; status stays a derived projection.';

revoke all on function public.transition_goal_rpc(uuid, text, integer, uuid, text) from public, anon;
grant execute on function public.transition_goal_rpc(uuid, text, integer, uuid, text) to authenticated;

-- ===========================================================================
-- 7. trash_goal_rpc / restore_goal_rpc — reused and adapted, not duplicated
-- ===========================================================================
--
-- Both writers already existed and were hardened in the R4a foundation
-- (auth.uid-derived actor, `goal.restore` capability, anti-spoofing,
-- `anon` EXECUTE = false). They are adapted in place instead of being replaced
-- by symmetric new RPCs — which is also why their previous 3-argument
-- signatures are dropped below: leaving them behind would keep two live
-- overloads of the same writer name (a PostgREST resolution hazard) and a
-- second, weaker write authority on the Plan root. What changes:
--
--   * the actor is resolved through `planner_goal_actor_context`, so a Personal
--     Plan (no household) is addressable and the capability context is explicit;
--   * `p_member_id` is now only an anti-spoof assertion — it can never authorize
--     the write;
--   * the durable trash metadata of §6 is written: `trashed_at`,
--     `trashed_by_person_id`, `trashed_by_member_id` (Hogar only) and
--     `trash_operation_id`;
--   * a trashed Plan is authorized as the owner when it is Personal.
--
-- Restore keeps its contract: it does not invent a lifecycle, does not
-- un-archive and does not touch children.

create or replace function public.trash_goal_rpc(
  p_goal_id uuid,
  p_expected_version integer default null,
  p_member_id uuid default null,
  p_context_household_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor jsonb;
  v_person_id uuid;
  v_member_id uuid;
  v_household_id uuid;
  v_goal public.planner_goals%rowtype;
  v_is_owner boolean;
begin
  v_actor := public.planner_goal_actor_context(p_context_household_id);
  v_person_id := (v_actor ->> 'person_id')::uuid;
  v_member_id := (v_actor ->> 'member_id')::uuid;
  v_household_id := (v_actor ->> 'household_id')::uuid;

  if p_member_id is not null and p_member_id <> v_member_id then
    raise exception 'actor spoofing rejected' using errcode = '42501';
  end if;

  select * into v_goal
  from public.planner_goals
  where id = p_goal_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'goal_not_found');
  end if;

  if v_goal.trashed_at is not null then
    return jsonb_build_object(
      'success', true, 'id', v_goal.id, 'version', v_goal.version, 'already_trashed', true
    );
  end if;

  v_is_owner := public.planner_goal_actor_is_owner(
    v_goal.visibility, v_goal.owner_person_id, v_goal.created_by_member_id, v_person_id, v_member_id
  );

  if not public.planner_current_actor_has_capability(v_household_id, 'goal.restore')
     or not v_is_owner then
    raise exception 'goal trash forbidden' using errcode = '42501';
  end if;

  if p_expected_version is not null and v_goal.version <> p_expected_version then
    raise exception 'goal version conflict' using errcode = '40007';
  end if;

  update public.planner_goals
  set trashed_at = now(),
      trashed_by_person_id = v_person_id,
      trashed_by_member_id = case when v_goal.visibility = 'household' then v_member_id else null end,
      trash_operation_id = gen_random_uuid()::text
  where id = p_goal_id
  returning * into v_goal;

  return jsonb_build_object('success', true, 'goal', to_jsonb(v_goal));
end;
$$;

comment on function public.trash_goal_rpc(uuid, integer, uuid, uuid) is
  'Plan trash writer. Actor derived from auth.uid(); goal.restore + owner required; p_member_id can only contradict the derived actor, never authorize.';

revoke all on function public.trash_goal_rpc(uuid, integer, uuid, uuid) from public, anon;
grant execute on function public.trash_goal_rpc(uuid, integer, uuid, uuid) to authenticated;

create or replace function public.restore_goal_rpc(
  p_goal_id uuid,
  p_expected_version integer default null,
  p_member_id uuid default null,
  p_context_household_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor jsonb;
  v_person_id uuid;
  v_member_id uuid;
  v_household_id uuid;
  v_goal public.planner_goals%rowtype;
  v_is_owner boolean;
begin
  v_actor := public.planner_goal_actor_context(p_context_household_id);
  v_person_id := (v_actor ->> 'person_id')::uuid;
  v_member_id := (v_actor ->> 'member_id')::uuid;
  v_household_id := (v_actor ->> 'household_id')::uuid;

  if p_member_id is not null and p_member_id <> v_member_id then
    raise exception 'actor spoofing rejected' using errcode = '42501';
  end if;

  select * into v_goal
  from public.planner_goals
  where id = p_goal_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'goal_not_found');
  end if;

  if v_goal.trashed_at is null then
    return jsonb_build_object(
      'success', true, 'id', v_goal.id, 'version', v_goal.version, 'already_restored', true
    );
  end if;

  v_is_owner := public.planner_goal_actor_is_owner(
    v_goal.visibility, v_goal.owner_person_id, v_goal.created_by_member_id, v_person_id, v_member_id
  );

  if not public.planner_current_actor_has_capability(v_household_id, 'goal.restore')
     or not v_is_owner then
    raise exception 'goal restore forbidden' using errcode = '42501';
  end if;

  if p_expected_version is not null and v_goal.version <> p_expected_version then
    raise exception 'goal version conflict' using errcode = '40007';
  end if;

-- Restore only reverses the trash. Lifecycle, archive and children are left
-- exactly as they were (§6).
  update public.planner_goals
set trashed_at = null,
      trashed_by_person_id = null,
      trashed_by_member_id = null,
      trash_operation_id = null,
      deleted_at = null
where id = p_goal_id
returning * into v_goal;

  return jsonb_build_object('success', true, 'goal', to_jsonb(v_goal));
end;
$$;

comment on function public.restore_goal_rpc(uuid, integer, uuid, uuid) is
  'Plan restore writer. Reverses trash only: lifecycle, archive and children are untouched.';

revoke all on function public.restore_goal_rpc(uuid, integer, uuid, uuid) from public, anon;
grant execute on function public.restore_goal_rpc(uuid, integer, uuid, uuid) to authenticated;

-- Retire the previous three-argument signatures. They cannot express the
-- household context a Personal Plan needs, and keeping them would leave the
-- Plan root with two callable trash/restore authorities.
drop function if exists public.trash_goal_rpc(uuid, integer, uuid);
drop function if exists public.restore_goal_rpc(uuid, integer, uuid);

-- ===========================================================================
-- 8. Idempotent retry of the Plan create path
-- ===========================================================================
--
-- The Plan create writer deliberately takes no idempotency key: the proven
-- `planner_idempotency_keys` reserve/complete pair stays the single
-- idempotency authority (Technical Truth §22, §35 "Keep proven idempotency
-- first"). R4b re-validates that pair against the new writer and it does not
-- replay.
--
-- DEFECT FOUND WHILE VALIDATING (pre-existing, not introduced by R4b):
-- `reserve_planner_idempotency_key` selects the existing key into a plpgsql
-- `record` and then guards on `if v_existing is not null`. For a plpgsql record
-- (and for a `%rowtype` variable) the SQL row-value `IS NULL` test is never
-- true, so `v_existing is not null` is ALWAYS false. The reserve therefore
-- always falls through to the INSERT branch and a retried request collides
-- with `planner_idempotency_keys_household_actor_op_key_uidx` (23505) instead
-- of replaying the stored response.
--
-- The only change is the guard: use plpgsql's `FOUND`, which is exactly what
-- `SELECT ... INTO` sets. Signature, return shape, expiry handling, conflict
-- detection (40007) and every stored field are untouched.

create or replace function public.reserve_planner_idempotency_key(
  p_household_id uuid,
  p_actor_member_id uuid,
  p_idempotency_key text,
  p_operation text,
  p_request_hash text,
  p_ttl_seconds integer DEFAULT 86400
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_existing record;
  v_expires_at timestamptz;
begin
  -- Validate required inputs
  if p_household_id is null then
    raise exception 'household_id es obligatorio.' using errcode = '42501';
  end if;
  if p_actor_member_id is null then
    raise exception 'actor_member_id es obligatorio.' using errcode = '42501';
  end if;
  if p_idempotency_key is null or length(btrim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key es obligatorio.' using errcode = '42501';
  end if;
  if p_operation is null or length(btrim(p_operation)) = 0 then
    raise exception 'operation es obligatorio.' using errcode = '42501';
  end if;
  if p_request_hash is null or length(btrim(p_request_hash)) = 0 then
    raise exception 'request_hash es obligatorio.' using errcode = '42501';
  end if;
  if p_ttl_seconds is null or p_ttl_seconds < 60 or p_ttl_seconds > 604800 then
    raise exception 'ttl_seconds debe estar entre 60 y 604800.' using errcode = '42501';
  end if;

  -- Validate active household member
  if not public.is_active_household_member(p_household_id) then
    raise exception 'No sos miembro activo del household.' using errcode = '42501';
  end if;

  -- Validate caller matches actor
  if p_actor_member_id <> public.current_household_member_id(p_household_id) then
    raise exception 'actor_member_id no coincide con el miembro actual.' using errcode = '42501';
  end if;

  v_expires_at := now() + (p_ttl_seconds || ' seconds')::interval;

  -- Lock existing row for the same key/operation scope
  select *
  into v_existing
  from public.planner_idempotency_keys
  where household_id = p_household_id
    and actor_member_id = p_actor_member_id
    and idempotency_key = p_idempotency_key
    and operation = p_operation
  for update;

  -- FOUND, not `v_existing is not null`: the row-value IS NULL test on a
  -- plpgsql record is never true, so the old guard could never replay.
  if found then
    -- Expired -> delete existing, insert fresh placeholder
    if v_existing.expires_at < now() then
      delete from public.planner_idempotency_keys
      where id = v_existing.id;

      insert into public.planner_idempotency_keys (
        household_id, actor_member_id, idempotency_key, operation,
        request_hash, response_status, response_body, expires_at
      ) values (
        p_household_id, p_actor_member_id, p_idempotency_key, p_operation,
        p_request_hash, 0, jsonb_build_object('__inflight', true), v_expires_at
      );

      return jsonb_build_object(
        'status', 'reserved',
        'response_status', 0,
        'response_body', jsonb_build_object('__inflight', true)
      );
    end if;

    -- Active existing row: same request_hash or conflict
    if v_existing.request_hash = p_request_hash then
      -- Touch last_seen_at
      update public.planner_idempotency_keys
      set last_seen_at = now()
      where id = v_existing.id;

      if v_existing.response_status = 0 then
        return jsonb_build_object(
          'status', 'in_flight',
          'response_status', 0,
          'response_body', jsonb_build_object('__inflight', true)
        );
      end if;

      return jsonb_build_object(
        'status', 'replay',
        'response_status', v_existing.response_status,
        'response_body', v_existing.response_body
      );
    end if;

    -- Different request_hash -> key already used with other payload
    -- Use errcode 40007 so backend can map to 409 idempotency_key_conflict.
    raise exception
      'La operacion ya fue procesada con otros datos.'
      using errcode = '40007';
  end if;

  -- Not found -> insert placeholder
  insert into public.planner_idempotency_keys (
    household_id, actor_member_id, idempotency_key, operation,
    request_hash, response_status, response_body, expires_at
  ) values (
    p_household_id, p_actor_member_id, p_idempotency_key, p_operation,
    p_request_hash, 0, jsonb_build_object('__inflight', true), v_expires_at
  );

  return jsonb_build_object(
    'status', 'reserved',
    'response_status', 0,
    'response_body', jsonb_build_object('__inflight', true)
  );
end;
$$;

comment on function public.reserve_planner_idempotency_key(uuid, uuid, text, text, text, integer) is
  'Reserves a Planner idempotency key. R4b: the replay guard uses FOUND; the previous `v_existing is not null` test was always false, so retries collided with the unique index instead of replaying.';

revoke all on function public.reserve_planner_idempotency_key(uuid, uuid, text, text, text, integer)
  from public, anon;
grant execute on function public.reserve_planner_idempotency_key(uuid, uuid, text, text, text, integer)
  to authenticated, service_role;

-- ===========================================================================
-- 9. Write boundary cutover
-- ===========================================================================
--
-- Target (Technical Truth §15): `authenticated` reads through RLS, writes
-- through the RPC writers above. `anon` has no root access at all.
--
-- `service_role` keeps its full grants and its BYPASSRLS, so the internal
-- maintenance / trash-listing paths that read through the admin client keep
-- working.

revoke all on public.planner_goals from anon;

revoke insert, update, delete, truncate, trigger, references
  on public.planner_goals from authenticated;

grant select on public.planner_goals to authenticated;

drop policy if exists planner_goals_insert_active_household on public.planner_goals;
drop policy if exists planner_goals_update_visible on public.planner_goals;
drop policy if exists planner_goals_select_visible on public.planner_goals;

create policy planner_goals_select_visible
  on public.planner_goals
  for select
  to authenticated
  using (
    deleted_at is null
    and trashed_at is null
    and public.planner_goal_is_visible(visibility, owner_person_id, household_id)
  );

comment on policy planner_goals_select_visible on public.planner_goals is
  'Personal Plans are owner-only; Hogar Plans need active membership plus planner.view; trashed and deleted Plans never appear on normal read surfaces.';

comment on table public.planner_goals is
  'Plan root (Technical Truth §1.1). Reads via RLS; writes only through create_goal_rpc / update_goal_rpc / transition_goal_rpc / trash_goal_rpc / restore_goal_rpc.';
