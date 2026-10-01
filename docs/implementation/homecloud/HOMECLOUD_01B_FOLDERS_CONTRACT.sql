-- HomeCloud HC-1B — Folders Foundation contract assertions.
--
-- Self-contained, transactional, safe to run locally:
--   psql -f docs/implementation/homecloud/HOMECLOUD_01B_FOLDERS_CONTRACT.sql
--
-- Runs inside a transaction that ROLLBACKs, so no fixture data persists.
-- Requires the HC-1A and HC-1B migrations already applied plus the existing
-- HomePlus base schema (public.people, public.households,
-- public.household_members). Any assertion failure raises an exception,
-- signalling a non-green gate.

\set ON_ERROR_STOP on
begin;

do $hc1b$
declare
  v_person uuid;
  v_person2 uuid;
  v_person3 uuid;
  v_household uuid;
  v_household2 uuid;
  v_member uuid;
  v_member2 uuid;
  v_member_b uuid;
  v_folder uuid;
  v_folder_a uuid;
  v_folder_b uuid;
  v_id uuid;
  v_file_id uuid;
  v_check uuid;
  v_pass integer := 0;
begin

  -- ── schema structure ────────────────────────────────────────────────
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'homecloud_folders'
  ) then
    raise exception 'HC1B FAIL: homecloud_folders missing';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'homecloud_folders'
      and column_name in ('parent_id', 'lifecycle', 'trashed_at')
  ) then
    raise exception 'HC1B FAIL: Folder must have no parent_id/lifecycle/trashed_at';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'homecloud_contents'
      and column_name = 'folder_id'
  ) then
    raise exception 'HC1B FAIL: homecloud_contents.folder_id missing';
  end if;

  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'homecloud_folders'
      and c.relrowsecurity
  ) then
    raise exception 'HC1B FAIL: homecloud_folders RLS not enabled';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'homecloud_folders'
  ) then
    raise exception 'HC1B FAIL: HC-1B must not create client policies';
  end if;

  v_pass := v_pass + 1;
  raise notice 'PASS: schema structure (folders table, no parent_id/lifecycle/trashed_at, contents.folder_id present, RLS enabled, no policies)';

  -- ── fixtures ────────────────────────────────────────────────────────
  insert into public.people (display_name)
  values ('HC1B contract person A')
  returning id into v_person;

  insert into public.people (display_name)
  values ('HC1B contract person A2')
  returning id into v_person2;

  insert into public.people (display_name)
  values ('HC1B contract person B')
  returning id into v_person3;

  insert into public.households (name, slug, created_by_person_id)
  values ('HC1B contract household A', 'hc1b-contract-a', v_person)
  returning id into v_household;

  insert into public.households (name, slug, created_by_person_id)
  values ('HC1B contract household B', 'hc1b-contract-b', v_person3)
  returning id into v_household2;

  insert into public.household_members (household_id, person_id)
  values (v_household, v_person)
  returning id into v_member;

  insert into public.household_members (household_id, person_id)
  values (v_household, v_person2)
  returning id into v_member2;

  insert into public.household_members (household_id, person_id)
  values (v_household2, v_person3)
  returning id into v_member_b;

  -- ── VALID: folder with normal name + creator membership ────────────
  insert into public.homecloud_folders (household_id, name, created_by_member_id)
  values (v_household, 'Documentos', v_member)
  returning id into v_folder;
  if v_folder is null then
    raise exception 'HC1B FAIL: valid folder rejected';
  end if;
  v_pass := v_pass + 1;
  raise notice 'PASS: valid folder (normal name, same-household creator) accepted';

  -- ── VALID: file with folder from same household ────────────────────
  insert into public.homecloud_contents (
    household_id, role, display_name, mime_type, original_storage_path, folder_id
  ) values (
    v_household, 'file', 'report.pdf', 'application/pdf',
    'hc1b/file/report.pdf', v_folder
  )
  returning id into v_file_id;
  if v_file_id is null then
    raise exception 'HC1B FAIL: valid file with same-household folder rejected';
  end if;
  v_pass := v_pass + 1;
  raise notice 'PASS: file with folder from same household accepted';

  -- ── VALID: file with folder_id NULL ─────────────────────────────────
  insert into public.homecloud_contents (
    household_id, role, display_name, mime_type, original_storage_path
  ) values (
    v_household, 'file', 'unfiled.txt', 'text/plain', 'hc1b/file/unfiled.txt'
  )
  returning id into v_id;
  if v_id is null then
    raise exception 'HC1B FAIL: valid file with null folder rejected';
  end if;
  v_pass := v_pass + 1;
  raise notice 'PASS: file with folder_id NULL accepted (unfiled valid)';

  -- ── DELETE FOLDER → file survives and becomes unfiled ──────────────
  delete from public.homecloud_folders where id = v_folder;
  select folder_id into v_check from public.homecloud_contents where id = v_file_id;
  if v_check is not null then
    raise exception 'HC1B FAIL: folder_id not set NULL after folder delete';
  end if;
  select id into v_check from public.homecloud_contents where id = v_file_id;
  if v_check is null then
    raise exception 'HC1B FAIL: file deleted together with folder';
  end if;
  v_pass := v_pass + 1;
  raise notice 'PASS: folder delete detaches file (file survives, folder_id NULL)';

  -- ── VALID: same name across two different households + NULL creator ─
  insert into public.homecloud_folders (household_id, name)
  values (v_household, 'Casa')
  returning id into v_folder_a;
  if v_folder_a is null then
    raise exception 'HC1B FAIL: household A folder Casa rejected';
  end if;

  insert into public.homecloud_folders (household_id, name)
  values (v_household2, 'Casa')
  returning id into v_folder_b;
  if v_folder_b is null then
    raise exception 'HC1B FAIL: household B folder Casa rejected';
  end if;
  v_pass := v_pass + 1;
  raise notice 'PASS: same name "Casa" allowed across different households (created_by_member_id NULL valid)';

  -- ── VALID: created_by_member_id may be NULL ────────────────────────
  insert into public.homecloud_folders (household_id, name, created_by_member_id)
  values (v_household, 'SinCreador', null)
  returning id into v_id;
  if v_id is null then
    raise exception 'HC1B FAIL: folder with null creator rejected';
  end if;
  v_pass := v_pass + 1;
  raise notice 'PASS: created_by_member_id NULL explicitly accepted';

  -- ── INVALID cases ───────────────────────────────────────────────────
  begin
    insert into public.homecloud_folders (household_id, name)
    values (v_household, '');
    raise exception 'HC1B FAIL: blank name accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: blank name rejected';
  end;

  begin
    insert into public.homecloud_folders (household_id, name)
    values (v_household, '   ');
    raise exception 'HC1B FAIL: whitespace-only name accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: whitespace-only name rejected';
  end;

  begin
    insert into public.homecloud_folders (household_id, name)
    values (v_household, 'Casa');
    raise exception 'HC1B FAIL: exact duplicate same-household name accepted';
  exception when unique_violation then
    v_pass := v_pass + 1; raise notice 'PASS: exact duplicate same-household name rejected';
  end;

  begin
    insert into public.homecloud_folders (household_id, name)
    values (v_household, 'casa');
    raise exception 'HC1B FAIL: case-variant duplicate name accepted';
  exception when unique_violation then
    v_pass := v_pass + 1; raise notice 'PASS: case-variant duplicate (Casa/casa) rejected';
  end;

  begin
    insert into public.homecloud_folders (household_id, name)
    values (v_household, ' Casa ');
    raise exception 'HC1B FAIL: trim-equivalent duplicate name accepted';
  exception when unique_violation then
    v_pass := v_pass + 1; raise notice 'PASS: trim-equivalent duplicate (Casa / " Casa ") rejected';
  end;

  begin
    insert into public.homecloud_contents (
      household_id, role, display_name, mime_type, original_storage_path, folder_id
    ) values (
      v_household, 'memory', 'clip.mp4', 'video/mp4', 'hc1b/inv/mem_folder', v_folder_a
    );
    raise exception 'HC1B FAIL: memory assigned a folder accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: memory assigned folder rejected';
  end;

  begin
    insert into public.homecloud_contents (
      household_id, role, display_name, mime_type, original_storage_path, folder_id
    ) values (
      v_household, 'file', 'cross.pdf', 'application/pdf', 'hc1b/inv/cross_household', v_folder_b
    );
    raise exception 'HC1B FAIL: cross-household folder assignment accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: cross-household folder assignment rejected';
  end;

  begin
    insert into public.homecloud_folders (household_id, name, created_by_member_id)
    values (v_household, 'CreadoPorOtro', v_member_b);
    raise exception 'HC1B FAIL: cross-household folder creator accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: cross-household creator rejected';
  end;

  raise notice 'HOMECLOUD_01B_FOLDERS_CONTRACT PASS (% assertions, all green)', v_pass;
end;
$hc1b$;

rollback;