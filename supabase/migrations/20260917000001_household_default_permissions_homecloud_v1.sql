-- Global Permissions — complete household default permissions with HomeCloud.
--
-- Root cause (new-household capability regression, 2026-09-17):
-- public.create_household() stamps config.permissions from
-- public.get_default_household_permissions(), whose snapshot only contained the
-- 6 legacy household keys (no homecloud.*). Households created after that
-- snapshot therefore carried a stored config.permissions that the backend
-- treated as the full authority, so every HomeCloud capability resolved false
-- for their coordinator (capabilities 200 all-false, reads 403).
--
-- This migration completes the SQL default snapshot with the four canonical
-- HomeCloud capability families, mirroring backend/src/lib/householdPermissions.js
-- DEFAULT_HOUSEHOLD_PERMISSIONS (HC-1D: HomeCloud owns capability names only;
-- role -> capability defaults stay in the Global Permissions authority).
--
-- Defense in depth lives in JS: resolveHouseholdCapabilities() now merges
-- stored config.permissions over defaults per capability key, so households
-- stamped with the legacy snapshot are repaired at resolution time without
-- any data backfill. This migration fixes the authority at the source for all
-- future households (create_household and join flows share this function).
--
-- No table changes. No seed changes. No Finance/Planner/Presence impact.

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
    )
  );
$$;
