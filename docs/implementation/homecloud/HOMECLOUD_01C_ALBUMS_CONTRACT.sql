-- HomeCloud HC-1C — Albums Foundation contract assertions.
--
-- Self-contained, transactional, safe to run locally:
--   psql -f docs/implementation/homecloud/HOMECLOUD_01C_ALBUMS_CONTRACT.sql
--
-- Runs inside a transaction that ROLLBACKs, so no fixture data persists.
-- Requires HC-1A, HC-1B, Memory Audio patch, and HC-1C migrations applied
-- plus the existing HomePlus base schema. Any assertion failure raises an
-- exception, signalling a non-green gate.

\set ON_ERROR_STOP on
begin;

do $hc1c$
declare
  v_person uuid;
  v_person2 uuid;
  v_person3 uuid;
  v_household uuid;
  v_household2 uuid;
  v_member uuid;
  v_member2 uuid;
  v_member_b uuid;
  v_album uuid;
  v_album2 uuid;
  v_mem_img uuid;
  v_mem_vid uuid;
  v_mem_aud uuid;
  v_mem_b uuid;
  v_file uuid;
  v_id uuid;
  v_check uuid;
  v_pass integer := 0;
begin

  -- ── fixtures ────────────────────────────────────────────────────────
  insert into public.people (display_name)
  values ('HC1C contract person A')
  returning id into v_person;

  insert into public.people (display_name)
  values ('HC1C contract person A2')
  returning id into v_person2;

  insert into public.people (display_name)
  values ('HC1C contract person B')
  returning id into v_person3;

  insert into public.households (name, slug, created_by_person_id)
  values ('HC1C contract household A', 'hc1c-contract-a', v_person)
  returning id into v_household;

  insert into public.households (name, slug, created_by_person_id)
  values ('HC1C contract household B', 'hc1c-contract-b', v_person3)
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

  -- ── Memories (image, video, audio) + one FILE for rejection tests ----
  insert into public.homecloud_contents (
    household_id, role, display_name, mime_type, original_storage_path,
    captured_at, capture_precision, lifecycle
  ) values
    (v_household, 'memory', 'photo.jpg', 'image/jpeg', 'hc1c/mem/photo.jpg',
     '2026-09-01T10:00:00Z', 'exact', 'active')
  returning id into v_mem_img;

  insert into public.homecloud_contents (
    household_id, role, display_name, mime_type, original_storage_path,
    captured_at, capture_precision, lifecycle
  ) values
    (v_household, 'memory', 'clip.mp4', 'video/mp4', 'hc1c/mem/clip.mp4',
     '2026-09-01T11:00:00Z', 'exact', 'active')
  returning id into v_mem_vid;

  insert into public.homecloud_contents (
    household_id, role, display_name, mime_type, original_storage_path,
    captured_at, capture_precision, lifecycle
  ) values
    (v_household, 'memory', 'song.mp3', 'audio/mpeg', 'hc1c/mem/song.mp3',
     '2026-09-01T12:00:00Z', 'exact', 'active')
  returning id into v_mem_aud;

  insert into public.homecloud_contents (
    household_id, role, display_name, mime_type, original_storage_path,
    document_date, note
  ) values
    (v_household, 'file', 'doc.pdf', 'application/pdf', 'hc1c/file/doc.pdf',
     '2026-09-01', 'file doc')
  returning id into v_file;

  insert into public.homecloud_contents (
    household_id, role, display_name, mime_type, original_storage_path,
    captured_at, capture_precision, lifecycle
  ) values
    (v_household2, 'memory', 'other-household.jpg', 'image/jpeg', 'hc1c/mem/other-household.jpg',
     '2026-09-01T13:00:00Z', 'exact', 'active')
  returning id into v_mem_b;

  -- ── SCHEMA STRUCTURE ────────────────────────────────────────────────
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'homecloud_albums'
  ) then
    raise exception 'HC1C FAIL: homecloud_albums missing';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'homecloud_album_items'
  ) then
    raise exception 'HC1C FAIL: homecloud_album_items missing';
  end if;

  -- Absent columns
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'homecloud_albums'
      and column_name in
        ('cover_content_id', 'cover_path', 'cover_url',
         'description', 'start_date', 'end_date',
         'owner_id', 'parent_album_id',
         'tags', 'position', 'sort_order', 'rank')
  ) then
    raise exception 'HC1C FAIL: forbidden column present in homecloud_albums';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'homecloud_album_items'
      and column_name in
        ('id', 'household_id', 'position', 'sort_order',
         'updated_at', 'caption', 'role', 'cover_content_id')
  ) then
    raise exception 'HC1C FAIL: forbidden column present in homecloud_album_items';
  end if;

  -- RLS enabled
  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'homecloud_albums'
      and c.relrowsecurity
  ) then
    raise exception 'HC1C FAIL: homecloud_albums RLS not enabled';
  end if;

  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'homecloud_album_items'
      and c.relrowsecurity
  ) then
    raise exception 'HC1C FAIL: homecloud_album_items RLS not enabled';
  end if;

  -- Zero permissive policies
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'homecloud_albums'
  ) then
    raise exception 'HC1C FAIL: homecloud_albums has client policies';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'homecloud_album_items'
  ) then
    raise exception 'HC1C FAIL: homecloud_album_items has client policies';
  end if;

  -- PK structure for album_items
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'homecloud_album_items'
      and constraint_type = 'PRIMARY KEY'
  ) then
    raise exception 'HC1C FAIL: homecloud_album_items primary key missing';
  end if;

  v_pass := v_pass + 1;
  raise notice 'PASS: schema structure (tables, absent columns, RLS, 0 policies, PK)';

  -- ── VALID ALBUMS ────────────────────────────────────────────────────
  -- empty Album
  insert into public.homecloud_albums (household_id, name)
  values (v_household, 'Vacaciones')
  returning id into v_album;
  v_pass := v_pass + 1;
  raise notice 'PASS: empty Album accepted';

  -- normal name
  insert into public.homecloud_albums (household_id, name, created_by_member_id)
  values (v_household, 'Primeros años', v_member)
  returning id into v_album2;
  v_pass := v_pass + 1;
  raise notice 'PASS: Album with normal name and creator accepted';

  -- two Albums named "Vacaciones" in same Household
  insert into public.homecloud_albums (household_id, name)
  values (v_household, 'Vacaciones')
  returning id into v_id;
  v_pass := v_pass + 1;
  raise notice 'PASS: duplicate name "Vacaciones" in same household allowed';

  -- active Album with trashed_at NULL
  insert into public.homecloud_albums (household_id, name, lifecycle, trashed_at)
  values (v_household, 'Activo', 'active', null)
  returning id into v_id;
  v_pass := v_pass + 1;
  raise notice 'PASS: active Album with trashed_at NULL accepted';

  -- trashed Album with trashed_at set
  insert into public.homecloud_albums (household_id, name, lifecycle, trashed_at)
  values (v_household, 'Papelera', 'trashed', now())
  returning id into v_id;
  v_pass := v_pass + 1;
  raise notice 'PASS: trashed Album with trashed_at set accepted';

  -- created_by_member_id NULL valid
  insert into public.homecloud_albums (household_id, name, created_by_member_id)
  values (v_household, 'SinCreador', null)
  returning id into v_id;
  v_pass := v_pass + 1;
  raise notice 'PASS: created_by_member_id NULL accepted';

  -- ── VALID MEMBERSHIPS ───────────────────────────────────────────────
  -- image Memory in Album
  insert into public.homecloud_album_items (album_id, content_id)
  values (v_album, v_mem_img);
  v_pass := v_pass + 1;
  raise notice 'PASS: image Memory in Album accepted';

  -- video Memory in Album
  insert into public.homecloud_album_items (album_id, content_id)
  values (v_album, v_mem_vid);
  v_pass := v_pass + 1;
  raise notice 'PASS: video Memory in Album accepted';

  -- audio Memory in Album
  insert into public.homecloud_album_items (album_id, content_id)
  values (v_album, v_mem_aud);
  v_pass := v_pass + 1;
  raise notice 'PASS: audio Memory in Album accepted';

  -- same Memory in two Albums
  insert into public.homecloud_album_items (album_id, content_id)
  values (v_album2, v_mem_img);
  v_pass := v_pass + 1;
  raise notice 'PASS: same Memory in two Albums accepted';

  -- multiple Memories in same Album
  insert into public.homecloud_album_items (album_id, content_id)
  values (v_album2, v_mem_aud);
  v_pass := v_pass + 1;
  raise notice 'PASS: multiple Memories in same Album accepted';

  -- mixed Album containing image + video + audio (already proven by above)

  -- added_by_member_id NULL
  insert into public.homecloud_album_items (album_id, content_id, added_by_member_id)
  values (v_album2, v_mem_vid, null);
  v_pass := v_pass + 1;
  raise notice 'PASS: added_by_member_id NULL accepted';

  -- valid same-Household added_by_member_id
  insert into public.homecloud_albums (household_id, name)
  values (v_household, 'AddedByAlbum')
  returning id into v_id;

  insert into public.homecloud_album_items (album_id, content_id, added_by_member_id)
  values (v_id, v_mem_aud, v_member);
  v_pass := v_pass + 1;
  raise notice 'PASS: same-Household added_by_member_id accepted';

  -- ── INVALID ALBUMS ──────────────────────────────────────────────────
  begin
    insert into public.homecloud_albums (household_id, name)
    values (v_household, '');
    raise exception 'HC1C FAIL: blank Album name accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: blank name rejected';
  end;

  begin
    insert into public.homecloud_albums (household_id, name)
    values (v_household, '   ');
    raise exception 'HC1C FAIL: whitespace-only name accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: whitespace-only name rejected';
  end;

  begin
    insert into public.homecloud_albums (household_id, name, lifecycle)
    values (v_household, 'x', 'random');
    raise exception 'HC1C FAIL: invalid lifecycle accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: invalid lifecycle rejected';
  end;

  begin
    insert into public.homecloud_albums (household_id, name, lifecycle, trashed_at)
    values (v_household, 'x', 'trashed', null);
    raise exception 'HC1C FAIL: trashed without trashed_at accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: trashed without trashed_at rejected';
  end;

  begin
    insert into public.homecloud_albums (household_id, name, lifecycle, trashed_at)
    values (v_household, 'x', 'active', now());
    raise exception 'HC1C FAIL: active with trashed_at accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: active with trashed_at rejected';
  end;

  -- wrong-Household created_by_member_id
  begin
    insert into public.homecloud_albums (household_id, name, created_by_member_id)
    values (v_household, 'x', v_member_b);
    raise exception 'HC1C FAIL: wrong-Household created_by_member_id accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: wrong-Household created_by_member_id rejected';
  end;

  -- wrong-Household trashed_by_member_id
  begin
    insert into public.homecloud_albums (household_id, name, trashed_by_member_id)
    values (v_household, 'x', v_member_b);
    raise exception 'HC1C FAIL: wrong-Household trashed_by_member_id accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: wrong-Household trashed_by_member_id rejected';
  end;

  -- ── INVALID MEMBERSHIPS ─────────────────────────────────────────────
  -- FILE added to Album
  begin
    insert into public.homecloud_album_items (album_id, content_id)
    values (v_album, v_file);
    raise exception 'HC1C FAIL: FILE added to Album accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: FILE in Album rejected';
  end;

  -- PDF FILE added to Album (same as above but explicit)

  -- Album Household A + Memory Household B
  begin
    insert into public.homecloud_album_items (album_id, content_id)
    values (v_album2, v_mem_b);
    raise exception 'HC1C FAIL: cross-Household Album+Memory accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: cross-Household Album+Memory rejected';
  end;

  -- duplicate album_id/content_id
  begin
    insert into public.homecloud_album_items (album_id, content_id)
    values (v_album, v_mem_img);
    raise exception 'HC1C FAIL: duplicate membership accepted';
  exception when unique_violation then
    v_pass := v_pass + 1; raise notice 'PASS: duplicate album_id/content_id rejected';
  end;

  -- wrong-Household added_by_member_id
  begin
    insert into public.homecloud_album_items (album_id, content_id, added_by_member_id)
    values (v_album, v_mem_vid, v_member_b);
    raise exception 'HC1C FAIL: wrong-Household added_by_member_id accepted';
  exception when check_violation then
    v_pass := v_pass + 1; raise notice 'PASS: wrong-Household added_by_member_id rejected';
  end;

  -- ── DELETE SEMANTICS ────────────────────────────────────────────────
  -- Hard delete Album → deletes album_items, DOES NOT delete Memories
  delete from public.homecloud_albums where id = v_album;
  if exists (
    select 1 from public.homecloud_album_items where album_id = v_album
  ) then
    raise exception 'HC1C FAIL: album_items not cascade-deleted on Album delete';
  end if;
  if not exists (
    select 1 from public.homecloud_contents where id = v_mem_img
  ) then
    raise exception 'HC1C FAIL: Memory deleted when Album hard-deleted';
  end if;
  v_pass := v_pass + 1;
  raise notice 'PASS: hard delete Album cascades items, keeps Memories';

  -- Hard delete Memory → deletes memberships, DOES NOT delete Album
  delete from public.homecloud_contents where id = v_mem_vid;
  if exists (
    select 1 from public.homecloud_album_items where content_id = v_mem_vid
  ) then
    raise exception 'HC1C FAIL: membership not deleted when Memory hard-deleted';
  end if;
  if not exists (
    select 1 from public.homecloud_albums where id = v_album2
  ) then
    raise exception 'HC1C FAIL: Album deleted when Memory hard-deleted';
  end if;
  v_pass := v_pass + 1;
  raise notice 'PASS: hard delete Memory cascades memberships, keeps Album';

  -- ── SOFT TRASH ──────────────────────────────────────────────────────
  -- Album lifecycle → trashed: album_items remain intact
  insert into public.homecloud_albums (household_id, name)
  values (v_household, 'ParaTrashear')
  returning id into v_id;

  insert into public.homecloud_album_items (album_id, content_id)
  values (v_id, v_mem_aud);

  update public.homecloud_albums
  set lifecycle = 'trashed', trashed_at = now()
  where id = v_id;

  if not exists (
    select 1 from public.homecloud_album_items where album_id = v_id
  ) then
    raise exception 'HC1C FAIL: album_items deleted on Album soft trash';
  end if;
  v_pass := v_pass + 1;
  raise notice 'PASS: Album soft trash preserves album_items';

  -- Memory lifecycle → trashed: album_items remain intact
  update public.homecloud_contents
  set lifecycle = 'trashed', trashed_at = now()
  where id = v_mem_aud;

  if not exists (
    select 1 from public.homecloud_album_items where content_id = v_mem_aud
  ) then
    raise exception 'HC1C FAIL: membership deleted on Memory soft trash';
  end if;
  v_pass := v_pass + 1;
  raise notice 'PASS: Memory soft trash preserves album_items';

  raise notice 'HOMECLOUD_01C_ALBUMS_CONTRACT PASS (% assertions, all green)', v_pass;
end;
$hc1c$;

rollback;
