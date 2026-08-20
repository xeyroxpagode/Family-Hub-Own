-- Migration: Auth/Onboarding privilege repair for service_role and authenticated
-- Root cause: migration 202606210009_auth_onboarding_final.sql created tables
-- without granting DML privileges to service_role (backend) or authenticated (RLS).
-- Default ACLs established later did not apply retroactively.
-- This migration restores the minimum privileges required by canonical backend
-- Auth/Onboarding operations and RLS policies.

-- service_role: backend provisioning (supabaseAdmin)
--   people:       SELECT (getPersonByAuthUserId), INSERT (createPersonForUser), UPDATE (profile updates)
--   households:   SELECT (getMyHouseholds)
--   household_members: SELECT (getMyHouseholds, membership lookups)
--   household_invite_links: SELECT (invite link lookups by coordinator)

-- authenticated: client-side token-backed access via RLS
--   people:       SELECT, INSERT, UPDATE (self-only via RLS policies)
--   households:   SELECT (active member via RLS)
--   household_members: SELECT (allowed via RLS)
--   household_invite_links: SELECT (coordinator via RLS)

-- NO DELETE/TRUNCATE/REFERENCES/TRIGGER granted without demonstrated need.
-- RLS policies unchanged. No schema changes. Repeatable via normal migration apply.

grant select, insert, update on table public.people to service_role;
grant select on table public.households to service_role;
grant select on table public.household_members to service_role;
grant select on table public.household_invite_links to service_role;

grant select, insert, update on table public.people to authenticated;
grant select on table public.households to authenticated;
grant select on table public.household_members to authenticated;
grant select on table public.household_invite_links to authenticated;

-- Ensure future tables in public schema created by postgres/get default owner
-- inherit these privileges. This is defensive; Supabase manages its own defaults.
alter default privileges for role postgres in schema public
  grant select, insert, update on tables to service_role;
alter default privileges for role postgres in schema public
  grant select on tables to service_role;

alter default privileges for role postgres in schema public
  grant select, insert, update on tables to authenticated;
alter default privileges for role postgres in schema public
  grant select on tables to authenticated;