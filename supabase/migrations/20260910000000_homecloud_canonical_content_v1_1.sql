-- HomeCloud HC-1A - Canonical Content Foundation.
--
-- Establishes public.homecloud_contents as the canonical HomeCloud content
-- identity. One slice only. It does NOT implement folders/albums/capabilities,
-- Storage buckets, upload/TUS, pickers/viewers, Files/Memories UI, timeline,
-- trash/restore behavior, role transitions or cross-module integration.
--
-- role is SEMANTIC ONLY: 'file' and 'memory' describe content kind, they are
-- not authorization roles. Final HomeCloud RLS/authorization belongs to HC-1D;
-- this slice only lays the structural foundation (RLS enabled, no client
-- policies yet).

create extension if not exists "pgcrypto";

create table if not exists public.homecloud_contents (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  role text not null,
  display_name text not null,
  mime_type text not null,
  extension text null,
  size_bytes bigint not null default 0,
  original_storage_path text not null,
  preview_storage_path text null,
  uploaded_by_member_id uuid null references public.household_members(id) on delete set null,
  uploaded_at timestamptz null,
  document_date date null,
  note text null,
  caption text null,
  captured_at timestamptz null,
  capture_precision text not null default 'unknown',
  lifecycle text not null default 'staging',
  trashed_at timestamptz null,
  trashed_by_member_id uuid null references public.household_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.homecloud_contents is
  'Canonical HomeCloud content identity. role (file|memory) is semantic only, not an authorization role. No folder_id yet: folders arrive in HC-1B.';

comment on column public.homecloud_contents.role is
  'Semantic content kind: file or memory. Never an authorization role.';

comment on column public.homecloud_contents.original_storage_path is
  'Canonical binary location. preview_storage_path is derived/regenerable, never the source of truth.';

comment on column public.homecloud_contents.preview_storage_path is
  'Derived, regenerable preview location. May be NULL; regenerate rather than treat as canonical.';

comment on column public.homecloud_contents.uploaded_at is
  'NULL while lifecycle = staging (upload not complete).';

comment on column public.homecloud_contents.captured_at is
  'Never falls back to uploaded_at. For file role this is always NULL.';

comment on column public.homecloud_contents.uploaded_by_member_id is
  'Metadata about who uploaded the content, not ownership.';

comment on column public.homecloud_contents.trashed_by_member_id is
  'Metadata about who trashed the content, not ownership.';

comment on column public.homecloud_contents.document_date is
  'Applies to role=file document metadata only; memory role requires document_date and note to be NULL.';

-- 1) role domain
alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_role_check;
alter table public.homecloud_contents
  add constraint homecloud_contents_role_check
  check (role in ('file', 'memory'));

-- 2) display_name not blank
alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_name_not_empty;
alter table public.homecloud_contents
  add constraint homecloud_contents_name_not_empty
  check (length(btrim(display_name)) > 0);

-- 3) lifecycle domain
alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_lifecycle_check;
alter table public.homecloud_contents
  add constraint homecloud_contents_lifecycle_check
  check (lifecycle in ('staging', 'active', 'trashed'));

-- 4) capture precision domain
alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_capture_precision_check;
alter table public.homecloud_contents
  add constraint homecloud_contents_capture_precision_check
  check (capture_precision in ('exact', 'month_year', 'year', 'unknown'));

-- 5) captured_at NULL iff precision unknown
alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_capture_unknown_equivalence;
alter table public.homecloud_contents
  add constraint homecloud_contents_capture_unknown_equivalence
  check ((captured_at is null) = (capture_precision = 'unknown'));

-- 6) memory must be image or video
alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_memory_media_check;
alter table public.homecloud_contents
  add constraint homecloud_contents_memory_media_check
  check (
    role <> 'memory'
    or mime_type like 'image/%'
    or mime_type like 'video/%'
  );

-- 7) file has no capture datetime
alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_file_no_capture;
alter table public.homecloud_contents
  add constraint homecloud_contents_file_no_capture
  check (role <> 'file' or captured_at is null);

-- 8) file has no caption
alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_file_no_caption;
alter table public.homecloud_contents
  add constraint homecloud_contents_file_no_caption
  check (role <> 'file' or caption is null);

-- 9) memory has no document metadata
alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_memory_no_doc_meta;
alter table public.homecloud_contents
  add constraint homecloud_contents_memory_no_doc_meta
  check (role <> 'memory' or (document_date is null and note is null));

-- 10) lifecycle trashed iff trashed_at set
alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_trash_consistency;
alter table public.homecloud_contents
  add constraint homecloud_contents_trash_consistency
  check ((lifecycle = 'trashed') = (trashed_at is not null));

-- additional scalar integrity consistent with existing HomePlus conventions
alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_size_bytes_nonnegative_check;
alter table public.homecloud_contents
  add constraint homecloud_contents_size_bytes_nonnegative_check
  check (size_bytes >= 0);

create index if not exists hc_contents_household_role_idx
  on public.homecloud_contents (household_id, role);

create index if not exists hc_contents_household_captured_idx
  on public.homecloud_contents (household_id, captured_at)
  where role = 'memory';

create index if not exists hc_contents_household_docdate_idx
  on public.homecloud_contents (household_id, document_date)
  where role = 'file';

create index if not exists hc_contents_household_lifecycle_idx
  on public.homecloud_contents (household_id, lifecycle);

alter table public.homecloud_contents
  drop constraint if exists hc_contents_original_path_unique;
alter table public.homecloud_contents
  add constraint hc_contents_original_path_unique
  unique (original_storage_path);

drop trigger if exists trg_homecloud_contents_updated_at on public.homecloud_contents;
create trigger trg_homecloud_contents_updated_at
  before update on public.homecloud_contents
  for each row
  execute function public.set_updated_at();

-- RLS structural foundation only. HC-1D owns final HomeCloud authorization
-- policies. No client-readable policies (and no table GRANT to client roles)
-- exist here, so this slice cannot accidentally expose reads that bypass the
-- future homecloud.view gate.
alter table public.homecloud_contents enable row level security;

notify pgrst, 'reload schema';