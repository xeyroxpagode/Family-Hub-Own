-- HomeCloud — MEMORY AUDIO SUPPORT semantic patch contract assertions.
--
-- Self-contained, transactional, safe to run locally:
--   psql -f docs/implementation/homecloud/HOMECLOUD_MEMORY_AUDIO_SUPPORT_CONTRACT.sql
--
-- Runs inside a transaction that ROLLBACKs, so no fixture data persists.
-- Requires the HC-1A, HC-1B and Memory Audio migration already applied plus the
-- existing HomePlus base schema. Any assertion failure raises an exception.
--
-- Proves audio/* is now a valid MEMORY MIME while role stays exactly
-- file|memory, arbitrary MIME stays invalid as MEMORY, and HC-1A/HC-1B
-- invariants (capture rules, folder rules, no audio-specific columns) remain.

\set ON_ERROR_STOP on
begin;

do $mem_audio$
declare
  v_person uuid;
  v_person2 uuid;
  v_household uuid;
  v_member uuid;
  v_member2 uuid;
  v_id uuid;
  v_folder uuid;
  v_pass integer := 0;
begin

  -- ── fixtures ────────────────────────────────────────────────────────
  insert into public.people (display_name)
  values ('MEM-AUDIO contract person')
  returning id into v_person;

  insert into public.households (name, slug, created_by_person_id)
  values ('MEM-AUDIO contract household', 'mem-audio-contract', v_person)
  returning id into v_household;

  insert into public.people (display_name)
  values ('MEM-AUDIO contract person 2')
  returning id into v_person2;

  insert into public.household_members (household_id, person_id)
  values (v_household, v_person)
  returning id into v_member;

  insert into public.household_members (household_id, person_id)
  values (v_household, v_person2)
  returning id into v_member2;

  -- create a folder for the audio MEMORY folder test
  insert into public.homecloud_folders (household_id, name)
  values (v_household, 'TestFolder')
  returning id into v_folder;

  -- ── schema: no audio-specific columns, no new role ─────────────────
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'homecloud_contents'
      and column_name in
        ('duration', 'waveform', 'waveform_path', 'audio_title', 'artist',
         'transcript', 'audio_role', 'audio_metadata')
  ) then
    raise exception 'MEM-AUDIO FAIL: audio-specific column present in homecloud_contents';
  end if;

  -- role domain unchanged: still only file|memory (no audio role)
  if exists (
    select 1 from information_schema.table_constraints tc
    join information_schema.tables t
      on t.table_schema = tc.table_schema and t.table_name = tc.table_name
    where tc.constraint_type = 'CHECK'
      and t.table_schema = 'public' and t.table_name = 'homecloud_contents'
      and lower(tc.constraint_name) = 'homecloud_audio_role'
  ) then
    raise exception 'MEM-AUDIO FAIL: an audio role constraint exists';
  end if;

  v_pass := v_pass + 1;
  raise notice 'PASS: no audio-specific columns, no audio role';

  -- ── VALID MEMORY: image/video/audio ────────────────────────────────
  insert into public.homecloud_contents (
    household_id, role, display_name, mime_type, original_storage_path
  ) values
    (v_household, 'memory', 'photo.jpg', 'image/jpeg', 'mem-audio/mem/photo.jpg'),
    (v_household, 'memory', 'clip.mp4', 'video/mp4', 'mem-audio/mem/clip.mp4'),
    (v_household, 'memory', 'song.mp3', 'audio/mpeg', 'mem-audio/mem/song.mp3'),
    (v_household, 'memory', 'a.mp4', 'audio/mp4', 'mem-audio/mem/a.mp4'),
    (v_household, 'memory', 'a.m4a', 'audio/x-m4a', 'mem-audio/mem/a.m4a'),
    (v_household, 'memory', 'a.ogg', 'audio/ogg', 'mem-audio/mem/a.ogg');
  v_pass := v_pass + 1;
  raise notice 'PASS: image/video/audio MEMORY all accepted';

  -- ── INVALID MEMORY: generic non-media ──────────────────────────────
  begin
    insert into public.homecloud_contents (
      household_id, role, display_name, mime_type, original_storage_path
    ) values (v_household, 'memory', 'x', 'application/pdf', 'mem-audio/inv/pdf');
    raise exception 'MEM-AUDIO FAIL: MEMORY application/pdf accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: MEMORY application/pdf rejected';
  end;

  begin
    insert into public.homecloud_contents (
      household_id, role, display_name, mime_type, original_storage_path
    ) values (v_household, 'memory', 'x', 'application/zip', 'mem-audio/inv/zip');
    raise exception 'MEM-AUDIO FAIL: MEMORY application/zip accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: MEMORY application/zip rejected';
  end;

  begin
    insert into public.homecloud_contents (
      household_id, role, display_name, mime_type, original_storage_path
    ) values (v_household, 'memory', 'x', 'text/plain', 'mem-audio/inv/txt');
    raise exception 'MEM-AUDIO FAIL: MEMORY text/plain accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: MEMORY text/plain rejected';
  end;

  begin
    insert into public.homecloud_contents (
      household_id, role, display_name, mime_type, original_storage_path
    ) values (v_household, 'memory', 'x', 'application/octet-stream', 'mem-audio/inv/bin');
    raise exception 'MEM-AUDIO FAIL: MEMORY application/octet-stream accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: MEMORY application/octet-stream rejected';
  end;

  -- ── VALID FILE: generic MIME stays valid in FILE role ──────────────
  insert into public.homecloud_contents (
    household_id, role, display_name, mime_type, original_storage_path
  ) values
    (v_household, 'file', 'doc.pdf', 'application/pdf', 'mem-audio/file/doc.pdf'),
    (v_household, 'file', 'arc.zip', 'application/zip', 'mem-audio/file/arc.zip'),
    (v_household, 'file', 'note.txt', 'text/plain', 'mem-audio/file/note.txt');
  v_pass := v_pass + 1;
  raise notice 'PASS: generic MIME remain valid FILE content';

  -- ── role domain unchanged ───────────────────────────────────────────
  begin
    insert into public.homecloud_contents (
      household_id, role, display_name, mime_type, original_storage_path
    ) values (v_household, 'audio', 'x', 'audio/mpeg', 'mem-audio/inv/role-audio');
    raise exception 'MEM-AUDIO FAIL: role=audio accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: role=audio still rejected';
  end;

  -- ── audio MEMORY folder_id must be NULL (HC-1B invariant) ──────────
  begin
    insert into public.homecloud_contents (
      household_id, role, display_name, mime_type, original_storage_path, folder_id
    ) values (
      v_household, 'memory', 'a.mp3', 'audio/mpeg', 'mem-audio/inv/audio_folder',
      v_folder
    );
    raise exception 'MEM-AUDIO FAIL: audio MEMORY assigned a folder accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: audio MEMORY with folder rejected (Memory cannot have folder)';
  end;

  -- ── capture rules unchanged ─────────────────────────────────────────
  begin
    insert into public.homecloud_contents (
      household_id, role, display_name, mime_type, original_storage_path, captured_at, capture_precision
    ) values (v_household, 'memory', 'a.mp3', 'audio/mpeg', 'mem-audio/inv/capture', null, 'exact');
    raise exception 'MEM-AUDIO FAIL: NULL captured_at + exact accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: capture NULL+exact still rejected';
  end;

  begin
    insert into public.homecloud_contents (
      household_id, role, display_name, mime_type, original_storage_path, captured_at, capture_precision
    ) values (v_household, 'file', 'x', 'application/pdf', 'mem-audio/inv/file_capture', now(), 'exact');
    raise exception 'MEM-AUDIO FAIL: FILE with captured_at accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: FILE captured_at still rejected';
  end;

  raise notice 'HOMECLOUD_MEMORY_AUDIO_SUPPORT_CONTRACT PASS (% assertions, all green)', v_pass;
end;
$mem_audio$;

rollback;