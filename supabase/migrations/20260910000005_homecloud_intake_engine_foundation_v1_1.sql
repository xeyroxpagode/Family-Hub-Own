-- HomeCloud HC-2A — Upload/Intake Engine Foundation.
--
-- Adds the client-supplied register idempotency identifier so a retried
-- register request cannot accidentally create a duplicate canonical content
-- row. The identifier is scoped per-Household (so the same identifier in a
-- different household never collides) and optional (rows created without it,
-- e.g. by privileged/system flows, remain valid).
--
-- This is the ONLY schema addition required for HC-2A. It does not modify any
-- canonical Stage-1 table structure beyond a single nullable column + a partial
-- unique index, and it never touches historical applied migrations.

alter table public.homecloud_contents
  add column if not exists intake_request_id text null;

create unique index if not exists hc_contents_household_intake_request_unique
  on public.homecloud_contents (household_id, intake_request_id)
  where intake_request_id is not null;

comment on column public.homecloud_contents.intake_request_id is
  'Client-supplied register idempotency identifier. Unique per-Household when present. Never semantic content, never exposed in safe DTOs.';

notify pgrst, 'reload schema';