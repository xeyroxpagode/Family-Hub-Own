-- Global Permissions - provision Assets capability grants (Assets P0 hotfix).
--
-- Root cause (2026-10-17: every GET /api/assets answered 403 assets_forbidden
-- for authorized members while /api/auth/me and Planner worked):
--   1. Assets capabilities are registered fail-closed in the backend default
--      matrix (A2 contract: no role defaults; explicit grants only).
--   2. Household config.permissions is the explicit-grant authority, but it is
--      stamped at creation from public.get_default_household_permissions(),
--      whose snapshot did not contain the assets.* families (registered later
--      by A2.1). No migration ever provisioned assets grants into household
--      configs. Result: no household ever holds an explicit assets grant, so
--      the fail-closed resolution denies assets.view to everyone.
--
-- Fix (H042 precedent: stamp + backfill, authority at the source):
--   1. Complete get_default_household_permissions() with the three canonical
--      Assets blocks so households created from now on carry explicit grants.
--   2. Backfill EXISTING households: for each assets capability block MISSING
--      in config.permissions, add the canonical block. Blocks already present
--      (explicit grants or revocations by the household) are left untouched.
--
-- Grants per Product Truth (SECCION 2, "Assets del hogar - Todo el hogar -
-- Responsabilidad compartida"): VIEW for every member; CONTRIBUTE and MANAGE
-- follow the sibling homecloud.contribute / homecloud.delete role mapping.
-- Hierarchy MANAGE => CONTRIBUTE => VIEW stays in the backend engine.
-- The backend fail-closed defaults are unchanged (A2 contract preserved);
-- users without capability (household revocation) keep receiving 403.
--
-- No table changes. No Planner/HomeCloud/Finance impact (per-capability keys).
create or replace function public.get_default_household_permissions()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'invite_members', jsonb_build_object(
      'coordinator', true,
      'adult', true,
      'adolescent', false,
      'child', false,
      'senior', true,
      'guest', false
    ),
    'approve_members', jsonb_build_object(
      'coordinator', true,
      'adult', true,
      'adolescent', false,
      'child', false,
      'senior', false,
      'guest', false
    ),
    'remove_members', jsonb_build_object(
      'coordinator', true,
      'adult', true,
      'adolescent', false,
      'child', false,
      'senior', false,
      'guest', false
    ),
    'manage_roles', jsonb_build_object(
      'coordinator', true,
      'adult', false,
      'adolescent', false,
      'child', false,
      'senior', false,
      'guest', false
    ),
    'assign_coordinator', jsonb_build_object(
      'coordinator', true,
      'adult', false,
      'adolescent', false,
      'child', false,
      'senior', false,
      'guest', false
    ),
    'edit_config', jsonb_build_object(
      'coordinator', true,
      'adult', false,
      'adolescent', false,
      'child', false,
      'senior', false,
      'guest', false
    ),
    'homecloud.view', jsonb_build_object(
      'coordinator', true,
      'adult', true,
      'adolescent', true,
      'child', true,
      'senior', true,
      'guest', true
    ),
    'homecloud.contribute', jsonb_build_object(
      'coordinator', true,
      'adult', true,
      'adolescent', true,
      'child', false,
      'senior', true,
      'guest', false
    ),
    'homecloud.organize', jsonb_build_object(
      'coordinator', true,
      'adult', true,
      'adolescent', false,
      'child', false,
      'senior', true,
      'guest', false
    ),
    'homecloud.delete', jsonb_build_object(
      'coordinator', true,
      'adult', true,
      'adolescent', false,
      'child', false,
      'senior', false,
      'guest', false
    ),
    'assets.view', jsonb_build_object(
      'coordinator', true,
      'adult', true,
      'adolescent', true,
      'child', true,
      'senior', true,
      'guest', true
    ),
    'assets.contribute', jsonb_build_object(
      'coordinator', true,
      'adult', true,
      'adolescent', true,
      'child', false,
      'senior', true,
      'guest', false
    ),
    'assets.manage', jsonb_build_object(
      'coordinator', true,
      'adult', true,
      'adolescent', false,
      'child', false,
      'senior', false,
      'guest', false
    )
  );
$$;

-- Backfill: add ONLY the missing assets capability blocks. Existing
-- config.permissions entries for a capability (explicit grant or revocation)
-- are authoritative and are never overwritten.
do $$
declare
  v_household record;
  v_current_config jsonb;
  v_current_permissions jsonb;
  v_updated_config jsonb;
  v_updated_permissions jsonb;
  v_defaults jsonb;
  v_capability text;
  v_changed boolean;
begin
  v_defaults := public.get_default_household_permissions();

  for v_household in
    select id, config from public.households
  loop
    v_current_config := coalesce(v_household.config, '{}'::jsonb);
    v_current_permissions := coalesce(v_current_config -> 'permissions', '{}'::jsonb);
    v_updated_permissions := v_current_permissions;
    v_changed := false;

    foreach v_capability in array array['assets.view', 'assets.contribute', 'assets.manage']
    loop
      if not (v_current_permissions ? v_capability) then
        v_updated_permissions := v_updated_permissions
          || jsonb_build_object(v_capability, v_defaults -> v_capability);
        v_changed := true;
      end if;
    end loop;

    if v_changed then
      v_updated_config := v_current_config
        || jsonb_build_object('permissions', v_updated_permissions);
      update public.households
        set config = v_updated_config
        where id = v_household.id;
      raise notice 'Assets grants provisionadas para household %', v_household.id;
    end if;
  end loop;
end
$$;
