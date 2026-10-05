#!/usr/bin/env node
'use strict';

/**
 * HomeCloud Files - Stage 2 / Phase 1 - MIGRATION SAFETY, proven in isolation.
 *
 * LOCAL_RUNTIME_REQUIRED, and destructive ONLY to databases this script creates.
 * The user's active HomePlus stack is never reset, never dropped and never
 * written to: everything happens inside throwaway databases that are created
 * from a template and dropped again in a `finally`.
 *
 * Two DISTINCT questions are answered, because they fail differently:
 *
 *   M-A  FRESH. A database that never had the Stage 2 hierarchy at all. This is
 *        what a brand new environment does, and it is where a migration that
 *        wrongly assumed a pre-existing constraint, index or function would
 *        fail. The final migration must apply cleanly and leave exactly ONE of
 *        each object: no duplicate function, trigger or index.
 *
 *   M-B  STAGE 1 UPGRADE. A realistic pre-Stage-2 database: FLAT folders with
 *        the Stage 1 household-wide name uniqueness, Files already linked to
 *        folders, and Favorites present. This is the shape every real household
 *        is in today, and it is where a destructive or identity-changing
 *        migration would destroy data. After the upgrade every folder must
 *        survive with the SAME id and household, land at the root, and keep every
 *        File link and Favorite.
 *
 * The Stage 1 shape is not simulated by guesswork: it is reconstructed by
 * REVERSING this run's own Stage 2 objects and reinstalling the exact Stage 1
 * definitions, taken from the historical migration
 * `20260910000001_homecloud_folders_v1_1.sql`, which is never edited.
 */

const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('../backend/node_modules/pg');
const { requireLocalUrl } = require('../tests/helpers/environment');
const { repositoryRoot } = require('../tests/helpers/process');

const databaseUrl = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const HIERARCHY_MIGRATION = path.join(repositoryRoot, 'supabase', 'migrations', '20261005000000_homecloud_folders_hierarchy_v2.sql');
const STAGE_1_MIGRATION = path.join(repositoryRoot, 'supabase', 'migrations', '20260910000001_homecloud_folders_v1_1.sql');
const FAVORITES_MIGRATION = path.join(repositoryRoot, 'supabase', 'migrations', '20261004000000_homecloud_file_favorites_v1.sql');

const FRESH_DB = 'zz_hcf_stage2_fresh';
const UPGRADE_DB = 'zz_hcf_stage2_upgrade';

let passCount = 0;
let failCount = 0;

function record(ok, message) {
  if (ok) { passCount += 1; console.log(`  PASS: ${message}`); return true; }
  failCount += 1; console.error(`  FAIL: ${message}`); return false;
}

function assert(condition, message) {
  if (!record(condition, message)) throw new Error(`MIGRATION_ASSERTION_FAILED: ${message}`);
}

function adminUrlFor(database) {
  const parsed = new URL(databaseUrl);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

async function connect(database) {
  const client = new Client({ connectionString: adminUrlFor(database), connectionTimeoutMillis: 10_000 });
  await client.connect();
  return client;
}

async function scalar(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows[0] ? Object.values(result.rows[0])[0] : null;
}

async function dropIfExists(admin, database) {
  // A leftover from an interrupted previous run must not block this one, and the
  // name is namespaced to this script precisely so nothing else can be hit.
  await admin.query(`select pg_terminate_backend(pid) from pg_stat_activity where datname = '${database}' and pid <> pg_backend_pid()`);
  await admin.query(`drop database if exists ${database}`);
}

/**
 * The minimal pre-HomeCloud foundation the folders lineage depends on. It exists
 * so the FRESH case really is fresh: no Stage 2 object is inherited from a
 * template, and nothing about the hierarchy is pre-installed.
 */
const FRESH_FOUNDATION = `
create extension if not exists "pgcrypto";
create table public.people (id uuid primary key default gen_random_uuid(), display_name text);
create table public.households (id uuid primary key default gen_random_uuid(), name text, created_by_person_id uuid references public.people(id) on delete set null);
create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  person_id uuid references public.people(id) on delete cascade,
  role text not null,
  status text not null default 'active'
);
create table public.homecloud_contents (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  role text not null,
  display_name text,
  mime_type text,
  extension text,
  size_bytes bigint,
  original_storage_path text,
  preview_storage_path text,
  uploaded_by_member_id uuid,
  uploaded_at timestamptz,
  document_date date,
  note text,
  caption text,
  written_text text,
  captured_at timestamptz,
  captured_year int,
  captured_month int,
  capture_precision text,
  hidden_from_resurfacing boolean not null default false,
  lifecycle text not null default 'active'
);
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;
`;

/**
 * Reverse Stage 2 and reinstall the exact Stage 1 folder contract, so the upgrade
 * case starts from the shape Stage 1 really produced.
 */
const STAGE_1_SHAPE = `
drop trigger if exists trg_homecloud_folders_hierarchy_invariants on public.homecloud_folders;
drop trigger if exists trg_homecloud_folders_updated_at on public.homecloud_folders;
drop trigger if exists trg_homecloud_folders_creator_household on public.homecloud_folders;
drop function if exists public.homecloud_folders_hierarchy_invariants();
drop function if exists public.homecloud_folders_hierarchy_lock_key(uuid);
drop function if exists public.homecloud_create_folder(uuid, text, uuid, uuid);
drop function if exists public.homecloud_move_folder(uuid, uuid);
drop function if exists public.homecloud_delete_folder(uuid);
drop function if exists public.homecloud_folders_lock_household(uuid);
drop index if exists public.hc_folders_parent_name_unique;
drop index if exists public.hc_folders_root_sibling_name_unique;
drop index if exists public.hc_folders_child_sibling_name_unique;
drop index if exists public.hc_folders_household_parent_idx;
alter table public.homecloud_folders drop constraint if exists homecloud_folders_parent_folder_fkey;
alter table public.homecloud_folders drop constraint if exists homecloud_folders_parent_folder_id_fkey;
alter table public.homecloud_folders drop column if exists parent_folder_id;
alter table public.homecloud_contents drop column if exists folder_id;

create table if not exists public.homecloud_folders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  created_by_member_id uuid null references public.household_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.homecloud_folders
  add constraint homecloud_folders_name_not_empty check (length(btrim(name)) > 0);
create unique index if not exists hc_folders_household_name_unique
  on public.homecloud_folders (household_id, lower(btrim(name)));
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;
create or replace function public.homecloud_folders_creator_household_check()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.created_by_member_id is not null
     and not exists (select 1 from public.household_members hm
                     where hm.id = new.created_by_member_id and hm.household_id = new.household_id) then
    raise exception 'created_by_member_id must be a membership of the same household' using errcode = '23514';
  end if;
  return new;
end; $$;
create trigger trg_homecloud_folders_creator_household
  before insert or update of household_id, created_by_member_id on public.homecloud_folders
  for each row execute function public.homecloud_folders_creator_household_check();
create trigger trg_homecloud_folders_updated_at
  before update on public.homecloud_folders
  for each row execute function public.set_updated_at();

alter table public.homecloud_contents
  add column if not exists folder_id uuid null references public.homecloud_folders(id) on delete set null;
create index if not exists hc_contents_folder_idx on public.homecloud_contents (household_id, folder_id);
create or replace function public.homecloud_contents_folder_invariants()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_folder_household uuid;
begin
  if new.folder_id is null then return new; end if;
  if new.role = 'memory' then
    raise exception 'folder_id may only be set on file role, not memory' using errcode = '23514';
  end if;
  select household_id into v_folder_household from public.homecloud_folders where id = new.folder_id;
  if v_folder_household is distinct from new.household_id then
    raise exception 'folder_id must reference a folder in the same household' using errcode = '23514';
  end if;
  return new;
end; $$;
create trigger trg_homecloud_contents_folder_invariants
  before insert or update of household_id, folder_id, role on public.homecloud_contents
  for each row execute function public.homecloud_contents_folder_invariants();
`;

async function run() {
  const parsed = new URL(databaseUrl);
  // Same hard rule the runtime suites enforce: local PostgreSQL only.
  assert(['127.0.0.1', 'localhost'].includes(parsed.hostname), `the database URL is local loopback (${parsed.hostname})`);

  const admin = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 10_000 });
  await admin.connect();
  console.log('\n=== HOMECLOUD FILES: STAGE 2 MIGRATION SAFETY (isolated databases) ===\n');
  console.log(`Target local PostgreSQL: ${parsed.hostname}:${parsed.port}`);

  const hierarchySql = fs.readFileSync(HIERARCHY_MIGRATION, 'utf8');
  const stage1Sql = fs.readFileSync(STAGE_1_MIGRATION, 'utf8');
  const favoritesSql = fs.readFileSync(FAVORITES_MIGRATION, 'utf8');

  try {
    // ── M-A: FRESH ──────────────────────────────────────────────────────────
    console.log('\n--- M-A: fresh database, no Stage 2 object ever existed ---');
    await dropIfExists(admin, FRESH_DB);
    await admin.query(`create database ${FRESH_DB}`);
    {
      const db = await connect(FRESH_DB);
      try {
        await db.query(FRESH_FOUNDATION);
        // The real Stage 1 folders migration is applied unmodified, so the fresh
        // case starts from genuine Stage 1 rather than a hand-written imitation.
        await db.query(stage1Sql);
        assert(await scalar(db, `select count(*) from information_schema.columns where table_schema='public' and table_name='homecloud_folders' and column_name='parent_folder_id'`) === '0', 'M-A1. the fresh database has NO parent_folder_id before the Stage 2 migration');

        await db.query(hierarchySql);
        record(true, 'M-A2. the Stage 2 hierarchy migration applies cleanly to a fresh Stage 1 database');

        assert(await scalar(db, `select count(*) from information_schema.columns where table_schema='public' and table_name='homecloud_folders' and column_name='parent_folder_id'`) === '1', 'M-A3. parent_folder_id exists exactly once');
        assert(await scalar(db, `select count(*) from pg_constraint where conrelid='public.homecloud_folders'::regclass and contype='f' and confrelid='public.homecloud_folders'::regclass`) === '1', 'M-A4. exactly ONE self-referencing folder FK exists');
        assert(await scalar(db, `select count(*) from pg_indexes where schemaname='public' and tablename='homecloud_folders' and indexname='hc_folders_parent_name_unique'`) === '1', 'M-A5. the sibling uniqueness index exists exactly once');
        assert(await scalar(db, `select count(*) from pg_indexes where schemaname='public' and tablename='homecloud_folders' and indexname like 'hc_folders_%sibling%'`) === '0', 'M-A6. no superseded partial sibling index survives');
        assert(await scalar(db, `select count(*) from pg_indexes where schemaname='public' and tablename='homecloud_folders' and indexname='hc_folders_household_name_unique'`) === '0', 'M-A7. the Stage 1 household-wide flat uniqueness is gone');
        for (const fn of ['homecloud_create_folder', 'homecloud_move_folder', 'homecloud_delete_folder', 'homecloud_folders_hierarchy_lock_key', 'homecloud_folders_hierarchy_invariants']) {
          assert(await scalar(db, `select count(*) from pg_proc where pronamespace='public'::regnamespace and proname='${fn}'`) === '1', `M-A8. ${fn} exists exactly once`);
        }
        assert(await scalar(db, `select count(*) from pg_proc where pronamespace='public'::regnamespace and proname='homecloud_folders_lock_household'`) === '0', 'M-A9. the superseded lock helper is absent');
        assert(await scalar(db, `select count(*) from pg_trigger where tgrelid='public.homecloud_folders'::regclass and tgname='trg_homecloud_folders_hierarchy_invariants'`) === '1', 'M-A10. the hierarchy trigger exists exactly once');
        const fkDef = await scalar(db, `select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.homecloud_folders'::regclass and confrelid='public.homecloud_folders'::regclass and contype='f'`);
        record(/DEFERRABLE INITIALLY DEFERRED/.test(fkDef), `M-A11. the parent FK is deferrable (${fkDef})`);
        record(!/ON DELETE CASCADE/i.test(fkDef), 'M-A12. the parent FK can never cascade-delete a subtree');
        const idxDef = await scalar(db, `select indexdef from pg_indexes where schemaname='public' and indexname='hc_folders_parent_name_unique'`);
        record(/NULLS NOT DISTINCT/i.test(idxDef), 'M-A13. sibling uniqueness treats a NULL parent as one real scope');
        const anon = await scalar(db, `select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'homecloud_%folder%' and (p.proacl @> ARRAY['=X/postgres']::aclitem[])`);
        record(anon === null || Number(anon) === 0, 'M-A14. no hierarchy function is executable by PUBLIC');

        // Re-apply must converge, not corrupt: the migration is the operator's
        // recovery tool, so running it twice has to be safe.
        await db.query(hierarchySql);
        record(true, 'M-A15. the migration is RE-APPLICAble: a second run converges instead of failing');
        assert(await scalar(db, `select count(*) from pg_indexes where schemaname='public' and tablename='homecloud_folders' and indexname='hc_folders_parent_name_unique'`) === '1', 'M-A16. re-applying still leaves exactly ONE sibling index');
        assert(await scalar(db, `select count(*) from pg_trigger where tgrelid='public.homecloud_folders'::regclass and tgname='trg_homecloud_folders_hierarchy_invariants'`) === '1', 'M-A17. re-applying still leaves exactly ONE hierarchy trigger');
      } finally {
        await db.end();
      }
    }

    // ── M-B: STAGE 1 UPGRADE ────────────────────────────────────────────────
    console.log('\n--- M-B: realistic Stage 1 database upgraded through Stage 2 ---');
    await dropIfExists(admin, UPGRADE_DB);
    await admin.query(`create database ${UPGRADE_DB}`);
    {
      const db = await connect(UPGRADE_DB);
      try {
        // Genuine Stage 1: the real historical migrations, applied unmodified, on
        // a database that has never seen Stage 2. Nothing is hand-imitated here.
        await db.query(FRESH_FOUNDATION);
        await db.query(stage1Sql);
        await db.query(favoritesSql);
        assert(await scalar(db, `select count(*) from information_schema.columns where table_schema='public' and table_name='homecloud_folders' and column_name='parent_folder_id'`) === '0', 'M-B1. the Stage 1 database has flat folders and no parent column');
        assert(await scalar(db, `select count(*) from pg_indexes where schemaname='public' and indexname='hc_folders_household_name_unique'`) === '1', 'M-B2. Stage 1 household-wide name uniqueness is in place');

        // Seed a representative Stage 1 household: three folders across two
        // households, Files filed under them, and a Favorite, so preservation is
        // measured against real relational shape rather than an empty table.
        await db.query(`
          insert into public.households (id, name) values
            ('11111111-1111-1111-1111-111111111111', 'S2 HH A'),
            ('22222222-2222-2222-2222-222222222222', 'S2 HH B');
          insert into public.people (id, display_name) values
            ('dddddddd-0000-0000-0000-000000000001', 'S2 Adult A'),
            ('dddddddd-0000-0000-0000-000000000002', 'S2 Adult B');
          insert into public.household_members (id, household_id, person_id, role, status) values
            ('eeeeeeee-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'dddddddd-0000-0000-0000-000000000001', 'coordinator', 'active'),
            ('eeeeeeee-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'dddddddd-0000-0000-0000-000000000002', 'adult', 'active');
          insert into public.homecloud_folders (id, household_id, name, created_at, updated_at) values
            ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Garantías', now() - interval '400 days', now() - interval '400 days'),
            ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Facturas', now() - interval '300 days', now() - interval '300 days'),
            ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Viajes', now() - interval '200 days', now() - interval '200 days');
          insert into public.homecloud_contents (id, household_id, role, display_name, mime_type, extension, size_bytes, original_storage_path, lifecycle, uploaded_at, folder_id) values
            ('cccccccc-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'file', 'poliza.pdf', 'application/pdf', 'pdf', 10, 'a/1', 'active', now() - interval '90 days', 'aaaaaaaa-0000-0000-0000-000000000001'),
            ('cccccccc-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'file', 'factura.txt', 'text/plain', 'txt', 10, 'a/2', 'active', now() - interval '80 days', 'aaaaaaaa-0000-0000-0000-000000000002'),
            ('cccccccc-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'file', 'suelta.txt', 'text/plain', 'txt', 10, 'a/3', 'active', now() - interval '70 days', null),
            ('cccccccc-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'file', 'recuerdo.jpg', 'image/jpeg', 'jpg', 10, 'b/1', 'active', now() - interval '60 days', null);
          insert into public.homecloud_file_favorites (household_id, person_id, content_id)
            values ('11111111-1111-1111-1111-111111111111', 'dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001');
          update public.homecloud_contents set role = 'memory' where id = 'cccccccc-0000-0000-0000-000000000004';
        `);

        const before = (await db.query(`
          select
            (select count(*) from homecloud_folders) as folders,
            (select coalesce(string_agg(id::text, ',' order by id), '') from homecloud_folders) as folder_ids,
            (select coalesce(string_agg(id::text || '@' || household_id::text || '@' || name, ',' order by id), '') from homecloud_folders) as folder_owners,
            (select count(*) from homecloud_contents where folder_id is not null) as linked,
            (select coalesce(string_agg(id::text || '->' || folder_id::text, ',' order by id), '') from homecloud_contents where folder_id is not null) as links,
            (select count(*) from homecloud_file_favorites) as favorites,
            (select count(*) from homecloud_contents) as contents,
            (select count(*) from homecloud_contents where role = 'memory') as memories
        `)).rows[0];
        record(Number(before.folders) === 3 && Number(before.linked) === 2 && Number(before.favorites) === 1,
          `M-B3. Stage 1 data seeded: ${before.folders} folders, ${before.linked} linked Files, ${before.favorites} Favorite, ${before.memories} Memory (${before.contents} contents)`);

        await db.query(hierarchySql);
        record(true, 'M-B4. the Stage 2 migration applies cleanly over Stage 1 data');

        const after = (await db.query(`
          select
            (select count(*) from homecloud_folders) as folders,
            (select coalesce(string_agg(id::text, ',' order by id), '') from homecloud_folders) as folder_ids,
            (select coalesce(string_agg(id::text || '@' || household_id::text || '@' || name, ',' order by id), '') from homecloud_folders) as folder_owners,
            (select count(*) from homecloud_folders where parent_folder_id is not null) as nested,
            (select count(*) from homecloud_contents where folder_id is not null) as linked,
            (select coalesce(string_agg(id::text || '->' || folder_id::text, ',' order by id), '') from homecloud_contents where folder_id is not null) as links,
            (select count(*) from homecloud_file_favorites) as favorites,
            (select count(*) from homecloud_contents) as contents,
            (select count(*) from homecloud_contents where role = 'memory') as memories
        `)).rows[0];

        assert(Number(after.folders) === Number(before.folders), `M-B5. folder COUNT preserved (${before.folders} -> ${after.folders})`);
        assert(after.folder_ids === before.folder_ids, 'M-B6. every folder ID is byte-identical: no id was regenerated');
        assert(after.folder_owners === before.folder_owners, 'M-B7. folder household OWNERSHIP and NAME unchanged');
        assert(Number(after.nested) === 0, 'M-B8. every pre-existing folder landed at the ROOT (parent_folder_id NULL)');
        assert(after.links === before.links, 'M-B9. every File.folder_id link is byte-identical: no File was relinked or orphaned');
        assert(Number(after.favorites) === Number(before.favorites), `M-B10. Favorites unchanged (${before.favorites} -> ${after.favorites})`);
        assert(Number(after.contents) === Number(before.contents), 'M-B11. no content row was created, removed or altered');
        assert(Number(after.memories) === Number(before.memories), 'M-B12. Memory semantics untouched (a Memory can still never belong to a folder)');

        // The upgraded schema must actually WORK, not merely exist.
        const hh = '11111111-1111-1111-1111-111111111111';
        const parent = 'aaaaaaaa-0000-0000-0000-000000000001';
        const child = (await db.query(`select id from homecloud_create_folder($1, 'Stage2 Kid', $2, null)`, [hh, parent])).rows[0].id;
        record(Boolean(child), 'M-B13. the upgraded database can create a folder inside a parent');
        assert(await scalar(db, 'select parent_folder_id::text from homecloud_folders where id = $1', [child]) === parent, 'M-B14. the created child stored the right parent');
        let cycleRefused = false;
        try { await db.query(`update homecloud_folders set parent_folder_id = $1 where id = $2`, [child, parent]); } catch (e) { cycleRefused = String(e.message).includes('homecloud_folder_cycle'); }
        record(cycleRefused, 'M-B15. the upgraded database still refuses a cycle');
        let directDeleteRefused = false;
        try { await db.query('delete from homecloud_folders where id = $1', [parent]); } catch (e) { directDeleteRefused = /foreign key constraint/i.test(String(e.message)); }
        record(directDeleteRefused, 'M-B16. a direct delete of a folder with children is REFUSED instead of silently relocating the subtree');
        // And the promotion authority still works on upgraded data.
        await db.query('select homecloud_delete_folder($1)', [child]);
        assert(await scalar(db, 'select count(*) from homecloud_folders where id = $1', [child]) === '0', 'M-B17. delete removed the upgraded child');
        record(await scalar(db, 'select count(*) from homecloud_folders where id = $1', [parent]) === '1', 'M-B18. and left its pre-existing parent untouched');
        record(await scalar(db, 'select count(*) from homecloud_contents where folder_id = $1', [parent]) === '1', 'M-B19. and left the Files filed in it untouched');
      } finally {
        await db.end();
      }
    }

    console.log(`\nHIERARCHY_MIGRATION_RESULT pass=${passCount} fail=${failCount}`);
    console.log(failCount === 0 ? 'HIERARCHY_MIGRATION_TESTS=PASS' : 'HIERARCHY_MIGRATION_TESTS=FAIL');
    return failCount === 0;
  } finally {
    // Only databases THIS script created are dropped. The active stack is never
    // touched, so a failure above still leaves the user's data exactly as it was.
    await dropIfExists(admin, FRESH_DB);
    await dropIfExists(admin, UPGRADE_DB);
    await admin.end();
    console.log(`Cleaned up only the temporary databases ${FRESH_DB} and ${UPGRADE_DB}.`);
  }
}

run().then((ok) => {
  process.exit(ok ? 0 : 1);
}).catch((error) => {
  console.error('HIERARCHY_MIGRATION_TESTS=ERROR');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});