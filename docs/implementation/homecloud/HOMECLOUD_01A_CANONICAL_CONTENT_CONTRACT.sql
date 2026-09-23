-- HomeCloud HC-1A — Canonical Content Foundation contract assertions.
--
-- Self-contained, transactional, safe to run locally:
--   psql -f docs/implementation/homecloud/HOMECLOUD_01A_CANONICAL_CONTENT_CONTRACT.sql
-- or, against a running local Supabase:
--   supabase db query -f docs/implementation/homecloud/HOMECLOUD_01A_CANONICAL_CONTENT_CONTRACT.sql
--
-- Runs inside a transaction that ROLLBACKs, so no fixture data persists.
-- Requires public.households, public.household_members and public.people
-- (the existing HomePlus base schema) plus the HC-1A migration already applied.
-- Any assertion failure raises an exception, signalling a non-green gate.

\set ON_ERROR_STOP on
begin;

do $hc1a$
declare
  v_person uuid;
  v_person2 uuid;
  v_household uuid;
  v_member uuid;
  v_member2 uuid;
  v_id uuid;
  v_check uuid;
  v_pass integer := 0;
begin

  -- ── fixtures ────────────────────────────────────────────────────────
  insert into public.people (display_name)
  values ('HC1A contract test person')
  returning id into v_person;

  insert into public.households (name, slug, created_by_person_id)
  values ('HC1A contract household', 'hc1a-contract', v_person)
  returning id into v_household;

  insert into public.people (display_name)
  values ('HC1A contract test person 2')
  returning id into v_person2;

  insert into public.household_members (household_id, person_id)
  values (v_household, v_person)
  returning id into v_member;

  insert into public.household_members (household_id, person_id)
  values (v_household, v_person2)
  returning id into v_member2;

  -- ── schema structure ────────────────────────────────────────────────
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'homecloud_contents'
  ) then
    raise exception 'HC1A FAIL: homecloud_contents missing';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'homecloud_contents'
      and column_name = 'folder_id'
  ) then
    raise exception 'HC1A FAIL: folder_id must NOT exist in HC-1A';
  end if;

  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'hc_contents_original_path_unique'
      and c.relkind = 'i'
  ) then
    raise exception 'HC1A FAIL: hc_contents_original_path_unique index missing';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'homecloud_contents'
  ) then
    raise exception 'HC1A FAIL: HC-1A must not create client policies';
  end if;

  v_pass := v_pass + 1;
  raise notice 'PASS: schema structure (table, no folder_id, unique index, no policies)';

  -- ── VALID FILE ──────────────────────────────────────────────────────
  -- role=file, captured_at NULL, precision unknown, doc metadata allowed,
  -- member metadata NULL, uploaded_at NULL while staging.
  insert into public.homecloud_contents (
    household_id, role, display_name, mime_type, extension, size_bytes,
    original_storage_path, uploaded_by_member_id, uploaded_at,
    document_date, note, caption, captured_at, capture_precision,
    lifecycle, trashed_at, trashed_by_member_id
  ) values (
    v_household, 'file', 'report.pdf', 'application/pdf', 'pdf', 1024,
    'hc1a/file/report.pdf', null, null,
    '2026-09-01', 'annual report', null, null, 'unknown',
    'staging', null, null
  )
  returning id into v_id;
  if v_id is null then
    raise exception 'HC1A FAIL: valid FILE rejected';
  end if;
  v_pass := v_pass + 1;
  raise notice 'PASS: valid FILE accepted';

  -- ── VALID MEMORY EXACT ──────────────────────────────────────────────
  insert into public.homecloud_contents (
    household_id, role, display_name, mime_type, size_bytes,
    original_storage_path, uploaded_by_member_id,
    document_date, note, caption, captured_at, capture_precision, lifecycle
  ) values (
    v_household, 'memory', 'birthday.jpg', 'image/jpeg', 2048,
    'hc1a/memory/birthday.jpg', v_member,
    null, null, null, '2026-09-01T10:00:00Z', 'exact', 'active'
  )
  returning id into v_id;
  if v_id is null then
    raise exception 'HC1A FAIL: valid MEMORY EXACT rejected';
  end if;
  v_pass := v_pass + 1;
  raise notice 'PASS: valid MEMORY EXACT accepted';

  -- ── VALID MEMORY UNKNOWN ────────────────────────────────────────────
  insert into public.homecloud_contents (
    household_id, role, display_name, mime_type, original_storage_path,
    captured_at, capture_precision, lifecycle
  ) values (
    v_household, 'memory', 'clip.mp4', 'video/mp4', 'hc1a/memory/clip.mp4',
    null, 'unknown', 'staging'
  )
  returning id into v_id;
  if v_id is null then
    raise exception 'HC1A FAIL: valid MEMORY UNKNOWN rejected';
  end if;
  v_pass := v_pass + 1;
  raise notice 'PASS: valid MEMORY UNKNOWN accepted';

  -- ── INVALID cases (expect check_violation) ──────────────────────────
  begin
    insert into public.homecloud_contents (household_id, role, display_name, mime_type, original_storage_path)
    values (v_household, 'random', 'x', 'application/pdf', 'hc1a/inv/role');
    raise exception 'HC1A FAIL: role=random accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: invalid role rejected';
  end;

  begin
    insert into public.homecloud_contents (household_id, role, display_name, mime_type, original_storage_path)
    values (v_household, 'file', '   ', 'application/pdf', 'hc1a/inv/blankname');
    raise exception 'HC1A FAIL: blank display_name accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: blank display_name rejected';
  end;

  begin
    insert into public.homecloud_contents (household_id, role, display_name, mime_type, original_storage_path, lifecycle)
    values (v_household, 'file', 'x', 'application/pdf', 'hc1a/inv/lifecycle', 'random');
    raise exception 'HC1A FAIL: lifecycle=random accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: invalid lifecycle rejected';
  end;

  begin
    insert into public.homecloud_contents (household_id, role, display_name, mime_type, original_storage_path, captured_at, capture_precision)
    values (v_household, 'memory', 'x', 'image/jpeg', 'hc1a/inv/precision', now(), 'random');
    raise exception 'HC1A FAIL: precision=random accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: invalid precision rejected';
  end;

  begin
    insert into public.homecloud_contents (household_id, role, display_name, mime_type, original_storage_path, captured_at, capture_precision)
    values (v_household, 'memory', 'x', 'image/jpeg', 'hc1a/inv/null_exact', null, 'exact');
    raise exception 'HC1A FAIL: NULL captured_at + exact accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: NULL captured + exact rejected';
  end;

  begin
    insert into public.homecloud_contents (household_id, role, display_name, mime_type, original_storage_path, captured_at, capture_precision)
    values (v_household, 'memory', 'x', 'image/jpeg', 'hc1a/inv/time_unknown', now(), 'unknown');
    raise exception 'HC1A FAIL: captured_at non-null + unknown accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: captured + unknown rejected';
  end;

  begin
    insert into public.homecloud_contents (household_id, role, display_name, mime_type, original_storage_path)
    values (v_household, 'memory', 'doc.pdf', 'application/pdf', 'hc1a/inv/mem_pdf');
    raise exception 'HC1A FAIL: MEMORY application/pdf accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: MEMORY application/pdf rejected';
  end;

  begin
    insert into public.homecloud_contents (household_id, role, display_name, mime_type, original_storage_path, captured_at, capture_precision)
    values (v_household, 'file', 'x', 'application/pdf', 'hc1a/inv/file_captured', now(), 'exact');
    raise exception 'HC1A FAIL: FILE with captured_at accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: FILE with captured_at rejected';
  end;

  begin
    insert into public.homecloud_contents (household_id, role, display_name, mime_type, original_storage_path, caption)
    values (v_household, 'file', 'x', 'application/pdf', 'hc1a/inv/file_caption', 'hello');
    raise exception 'HC1A FAIL: FILE with caption accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: FILE with caption rejected';
  end;

  begin
    insert into public.homecloud_contents (household_id, role, display_name, mime_type, original_storage_path, captured_at, capture_precision, note)
    values (v_household, 'memory', 'x', 'image/jpeg', 'hc1a/inv/mem_note', now(), 'exact', 'note');
    raise exception 'HC1A FAIL: MEMORY with note accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: MEMORY with note rejected';
  end;

  begin
    insert into public.homecloud_contents (household_id, role, display_name, mime_type, original_storage_path, size_bytes)
    values (v_household, 'file', 'x', 'application/pdf', 'hc1a/inv/neg_size', -1);
    raise exception 'HC1A FAIL: negative size accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: negative size rejected';
  end;

  begin
    insert into public.homecloud_contents (household_id, role, display_name, mime_type, original_storage_path, lifecycle, trashed_at)
    values (v_household, 'file', 'x', 'application/pdf', 'hc1a/inv/trash_noat', 'trashed', null);
    raise exception 'HC1A FAIL: trashed lifecycle without trashed_at accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: trashed without trashed_at rejected';
  end;

  begin
    insert into public.homecloud_contents (household_id, role, display_name, mime_type, original_storage_path, lifecycle, trashed_at)
    values (v_household, 'file', 'x', 'application/pdf', 'hc1a/inv/active_trashed', 'active', now());
    raise exception 'HC1A FAIL: active with trashed_at accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: active with trashed_at rejected';
  end;

  begin
    insert into public.homecloud_contents (household_id, role, display_name, mime_type, original_storage_path, lifecycle, trashed_at)
    values (v_household, 'file', 'x', 'application/pdf', 'hc1a/inv/staging_trashed', 'staging', now());
    raise exception 'HC1A FAIL: staging with trashed_at accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: staging with trashed_at rejected';
  end;

  -- ── nullable member metadata + SET NULL ─────────────────────────────
  insert into public.homecloud_contents (
    household_id, role, display_name, mime_type, original_storage_path,
    uploaded_by_member_id, trashed_by_member_id, lifecycle, trashed_at
  ) values (
    v_household, 'file', 'linked.pdf', 'application/pdf', 'hc1a/file/linked.pdf',
    v_member, v_member2, 'trashed', now()
  )
  returning id into v_id;
  if v_id is null then
    raise exception 'HC1A FAIL: member metadata insert rejected';
  end if;
  v_pass := v_pass + 1;
  raise notice 'PASS: uploaded_by/trashed_by member id set accepted';

  delete from public.household_members where id = v_member;
  select uploaded_by_member_id into v_check from public.homecloud_contents where id = v_id;
  if v_check is not null then
    raise exception 'HC1A FAIL: uploaded_by_member_id not set to NULL on member delete';
  end if;

  delete from public.household_members where id = v_member2;
  select trashed_by_member_id into v_check from public.homecloud_contents where id = v_id;
  if v_check is not null then
    raise exception 'HC1A FAIL: trashed_by_member_id not set to NULL on member delete';
  end if;
  v_pass := v_pass + 1;
  raise notice 'PASS: ON DELETE SET NULL for uploaded_by/trashed_by member ids';

  raise notice 'HOMECLOUD_01A_CANONICAL_CONTENT_CONTRACT PASS (assertions total, all green)';
end;
$hc1a$;

rollback;