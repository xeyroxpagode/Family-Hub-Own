-- HomeCloud STAGE 4A.2 - Memories V2 Persistence Foundation.
--
-- Converts the approved Memories V2 contract into real persistence. One
-- canonical table (public.homecloud_contents) now holds TWO valid content
-- forms:
--
--   BINARY  : File | Memory image/* | video/* | audio/* (Shared Upload Engine)
--   WRITTEN : Memory whose principal content is written_text (no bytes, no
--             fake MIME, no fake size, no fake storage path, no `.txt` File).
--
-- This slice does NOT implement Timeline, Camera, Recorder, Albums CRUD,
-- preview generation, Resurfacing, Search, role correction or Written UI.
--
-- Product Truth invariants enforced here:
--   - role stays exactly file|memory (semantic only).
--   - A File is ALWAYS binary (never written_text).
--   - A Written Memory is role='memory', has NO binary custody and therefore
--     keeps uploaded_at NULL forever (no bytes were ever taken into custody).
--   - captured_at represents ONLY an exact semantic date/time. Partial
--     semantics (year, month_year) use dedicated components captured_year /
--     captured_month. A fake timestamp is NEVER stored to approximate a
--     partial date.
--   - hidden_from_resurfacing persists the future Resurfacing contract
--     (default false, no behavior in this slice).
--
-- Migration sequence (single atomic transaction):
--   1. additive columns
--   2. safe backfill + historical-data decision gate
--   3. relax binary-only NOT NULLs
--   4. replace superseded constraints
--   5. add new shape/date/lifecycle constraints
--   6. index for the future Timeline
--   7. comments
-- No existing content row is deleted. No destructive rewrite happens.

-- ============================================================
-- 1) ADDITIVE COLUMNS
-- ============================================================

alter table public.homecloud_contents
  add column if not exists written_text text null;

alter table public.homecloud_contents
  add column if not exists captured_year smallint null;

alter table public.homecloud_contents
  add column if not exists captured_month smallint null;

alter table public.homecloud_contents
  add column if not exists hidden_from_resurfacing boolean not null default false;

-- ============================================================
-- 2) BACKFILL + HISTORICAL-DATA DECISION GATE
-- ============================================================

-- 2a) Exact rows: derive the real UTC year/month components. captured_at
-- keeps its meaning (exact semantic date/time); the components must match it.
update public.homecloud_contents
   set captured_year  = extract(year  from captured_at at time zone 'UTC'),
       captured_month = extract(month from captured_at at time zone 'UTC')
 where capture_precision = 'exact'
   and captured_at is not null
   and captured_year is null;

-- 2b) Unknown rows: components stay NULL (nothing to derive).

-- 2c) Historical partial rows (year / month_year): the previous contract
-- (captured_at NOT NULL iff precision <> 'unknown') forced these rows to
-- store a full timestamp. The meaning of that timestamp's day/time cannot be
-- demonstrated by any existing invariant, so this migration REFUSES to guess.
-- Environments with such rows require an explicit human decision before
-- Memories V2 persistence can apply. Local DB precheck (2026-09-25) found
-- zero rows in this situation, so the gate is a no-op locally.
do $$
declare
  v_partial bigint;
begin
  select count(*) into v_partial
    from public.homecloud_contents
   where capture_precision in ('year', 'month_year');
  if v_partial > 0 then
    raise exception using
      errcode = 'P0001',
      message = 'DATA MIGRATION DECISION REQUIRED: found ' || v_partial ||
        ' row(s) with capture_precision in (year, month_year). Their historical captured_at semantics cannot be assumed automatically. Decide the partial-date conversion explicitly before applying Memories V2 persistence.';
  end if;
end $$;

-- ============================================================
-- 3) RELAX BINARY-ONLY NOT NULL
--    (safe: every existing row is binary and fully populated; the shape
--    constraint in step 5 re-tightens the contract at the row level)
-- ============================================================

alter table public.homecloud_contents
  alter column display_name drop not null;

alter table public.homecloud_contents
  alter column mime_type drop not null;

alter table public.homecloud_contents
  alter column size_bytes drop not null;

-- size_bytes carried a DEFAULT 0 from HC-1A (when every content row was
-- binary). That default would silently fabricate a fake size for a Written
-- Memory (omitted column -> 0 instead of NULL), breaking the WRITTEN shape.
-- Drop it: binary registers always supply the real size explicitly.
alter table public.homecloud_contents
  alter column size_bytes drop default;

alter table public.homecloud_contents
  alter column original_storage_path drop not null;

-- ============================================================
-- 4) REPLACE SUPERSEDED CONSTRAINTS
-- ============================================================

-- 4a) display_name: still never blank, but NULL is allowed when the content
--     shape permits it (Written Memory has no file name; the text is the
--     content). An empty string is never a valid substitute for NULL.
alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_name_not_empty;
alter table public.homecloud_contents
  add constraint homecloud_contents_name_not_empty
  check (display_name is null or length(btrim(display_name)) > 0);

-- 4b) Memory media: a Memory is EITHER written OR binary media.
--     Written Memories carry their content in written_text; binary Memories
--     must still be image/*, video/* or audio/*. PDFs stay invalid Memories.
alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_memory_media_check;
alter table public.homecloud_contents
  add constraint homecloud_contents_memory_media_check
  check (
    role <> 'memory'
    or written_text is not null
    or mime_type like 'image/%'
    or mime_type like 'video/%'
    or mime_type like 'audio/%'
  );

-- 4c) Semantic date contract (replaces the old "captured_at NULL iff
--     unknown" equivalence, which could not represent partial dates):
--       unknown    -> captured_at NULL, captured_year NULL, captured_month NULL
--       year       -> captured_at NULL, captured_year set,  captured_month NULL
--       month_year -> captured_at NULL, captured_year set,  captured_month set
--       exact      -> captured_at set,   captured_year set,  captured_month set,
--                     and the components MUST match captured_at in UTC.
--     The UTC-coerced comparison is deterministic: it never depends on the
--     session timezone. Fake timestamps for partial dates are structurally
--     impossible because year/month_year REQUIRE captured_at to be NULL.
alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_capture_unknown_equivalence;
alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_capture_semantics_check;
alter table public.homecloud_contents
  add constraint homecloud_contents_capture_semantics_check
  check (
    (
      capture_precision = 'unknown'
      and captured_at is null
      and captured_year is null
      and captured_month is null
    )
    or (
      capture_precision = 'year'
      and captured_at is null
      and captured_year is not null
      and captured_month is null
    )
    or (
      capture_precision = 'month_year'
      and captured_at is null
      and captured_year is not null
      and captured_month is not null
    )
    or (
      capture_precision = 'exact'
      and captured_at is not null
      and captured_year is not null
      and captured_month is not null
      and captured_year = extract(year from captured_at at time zone 'UTC')
      and captured_month = extract(month from captured_at at time zone 'UTC')
    )
  );

-- 4d) Component ranges (smallint storage would allow 0 / negatives).
alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_capture_component_range_check;
alter table public.homecloud_contents
  add constraint homecloud_contents_capture_component_range_check
  check (
    (captured_year is null or (captured_year >= 1 and captured_year <= 9999))
    and (captured_month is null or (captured_month >= 1 and captured_month <= 12))
  );

-- 4e) Files keep the frozen date invariant: no captured date at all.
--     (Replaces the file_no_capture constraint; the capture_semantics check
--     then forces all components NULL via precision='unknown'.)
alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_file_no_capture;
alter table public.homecloud_contents
  add constraint homecloud_contents_file_no_capture
  check (
    role <> 'file'
    or (
      capture_precision = 'unknown'
      and captured_at is null
      and captured_year is null
      and captured_month is null
    )
  );

-- 4f) size_bytes: Written Memories have NO size (NULL, never a fake 0).
alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_size_bytes_nonnegative_check;
alter table public.homecloud_contents
  add constraint homecloud_contents_size_bytes_nonnegative_check
  check (size_bytes is null or size_bytes >= 0);

-- ============================================================
-- 5) NEW CONTENT-SHAPE / LIFECYCLE CONSTRAINTS
-- ============================================================

-- 5a) Content shape: exactly one of BINARY or WRITTEN. Degenerate rows
--     (half binary, half written) are impossible.
alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_shape_check;
alter table public.homecloud_contents
  add constraint homecloud_contents_shape_check
  check (
    (
      written_text is null
      and mime_type is not null
      and original_storage_path is not null
      and size_bytes is not null
    )
    or
    (
      written_text is not null
      and length(btrim(written_text)) > 0
      and mime_type is null
      and original_storage_path is null
      and size_bytes is null
    )
  );

-- 5b) Written purity: a Written Memory carries NO binary/document metadata.
--     The written text IS the principal content; caption would duplicate it,
--     display_name/extension/preview/uploaded_at would fake binary custody.
alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_written_purity_check;
alter table public.homecloud_contents
  add constraint homecloud_contents_written_purity_check
  check (
    written_text is null
    or (
      display_name is null
      and extension is null
      and preview_storage_path is null
      and uploaded_at is null
      and caption is null
      and folder_id is null
      and document_date is null
      and note is null
    )
  );

-- 5c) File invariant: a File is ALWAYS fully binary. Existing Files are not
--     weakened by the relaxed nullability above.
alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_file_binary_check;
alter table public.homecloud_contents
  add constraint homecloud_contents_file_binary_check
  check (
    role <> 'file'
    or (
      written_text is null
      and display_name is not null
      and mime_type is not null
      and size_bytes is not null
      and original_storage_path is not null
    )
  );

-- 5d) Active resolvable: active content must be usable WITHOUT another
--     write. A Written Memory is resolvable through written_text alone
--     (uploaded_at stays NULL because no bytes were ever taken into
--     custody). Binary content still requires full custody (uploaded original).
alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_active_resolvable_check;
alter table public.homecloud_contents
  add constraint homecloud_contents_active_resolvable_check
  check (
    lifecycle <> 'active'
    or written_text is not null
    or (uploaded_at is not null and original_storage_path is not null)
  );

-- 5e) hidden_from_resurfacing belongs to the persistent Memory model. A File
--     must keep it false (no special semantics). Persisted here structurally
--     so no privileged writer can ever set it on a File.
alter table public.homecloud_contents
  drop constraint if exists homecloud_contents_file_not_hidden_check;
alter table public.homecloud_contents
  add constraint homecloud_contents_file_not_hidden_check
  check (role <> 'file' or hidden_from_resurfacing = false);

-- ============================================================
-- 6) INDEX FOR THE FUTURE TIMELINE
--    (household -> year -> month -> exact time -> id, active Memories only).
--    The existing hc_contents_household_captured_idx stays: compatibility is
--    preferred over micro-optimization in this slice.
-- ============================================================

create index if not exists hc_contents_timeline_idx
  on public.homecloud_contents (
    household_id,
    captured_year desc,
    captured_month desc,
    captured_at desc nulls last,
    id
  )
  where role = 'memory' and lifecycle = 'active';

-- ============================================================
-- 7) COMMENTS
-- ============================================================

comment on column public.homecloud_contents.uploaded_at is
  'Timestamp of BINARY custody completion (set at canonical finalize). Validly NULL for a Written Memory: no bytes were ever taken into custody. Never a fallback source for captured_at.';

comment on column public.homecloud_contents.captured_at is
  'Exact semantic capture date/time only. NOT a fallback of uploaded_at. NULL for partial (year / month_year) and unknown dates; a fake timestamp is never stored to approximate a partial date. Always NULL for role=file.';

comment on column public.homecloud_contents.captured_year is
  'Partial semantic date component (UTC, 1..9999). For precision=exact it MUST match captured_at''s real UTC year (enforced by capture_semantics_check). Never derived from uploaded_at.';

comment on column public.homecloud_contents.captured_month is
  'Partial semantic date component (UTC, 1..12). For precision=exact it MUST match captured_at''s real UTC month (enforced by capture_semantics_check). Never derived from uploaded_at.';

comment on column public.homecloud_contents.written_text is
  'Principal content of a Written Memory (role=memory). Never a serialized File, never accompanied by fake binary metadata (see shape/written purity constraints). Binary content keeps this NULL.';

comment on column public.homecloud_contents.hidden_from_resurfacing is
  'Persisted contract for the future Resurfacing stage. Default false. No upload, Albums, or Files impact in this slice; Resurfacing itself is NOT implemented here.';

comment on column public.homecloud_contents.display_name is
  'Human name for BINARY content. NULL is valid only for Written Memory (the text is the content); when present it must be non-blank.';

comment on column public.homecloud_contents.mime_type is
  'MIME family of BINARY content. NULL for Written Memory (no fake MIME).';

comment on column public.homecloud_contents.size_bytes is
  'Byte size of BINARY content. NULL for Written Memory (no fake size).';

comment on column public.homecloud_contents.original_storage_path is
  'Canonical binary location for BINARY content. NULL for Written Memory (no bytes). preview_storage_path is derived/regenerable, never the source of truth.';

notify pgrst, 'reload schema';
