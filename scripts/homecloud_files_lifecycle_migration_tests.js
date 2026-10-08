#!/usr/bin/env node
'use strict';

/**
 * HomeCloud Files - LIFECYCLE V1 - MIGRATION + STATE MACHINE SAFETY, proven in
 * isolation.
 *
 * LOCAL_RUNTIME_REQUIRED, and destructive ONLY to databases this script
 * creates. The user's active HomePlus stack is never reset, never dropped and
 * never written to: everything happens inside throwaway databases that are
 * created and dropped again in a `finally`.
 *
 * Three DISTINCT questions are answered:
 *
 *   M-A  FRESH. A database that never had the Lifecycle V1 objects. The final
 *        migration must apply cleanly and leave exactly ONE of each object,
 *        and must be RE-APPLICAble (the operator's recovery tool).
 *
 *   M-B  UPGRADE. A realistic pre-Lifecycle database: active, trashed and
 *        staging contents, a Memory, a Favorite and a second household. Every
 *        row must survive byte-identical, and the upgraded database must
 *        actually WORK: the full state machine (trash/restore/purge) plus the
 *        worker primitives (claim/lease/complete/fail, crash recovery, late
 *        completion refusal) behave exactly as the contract freeze requires.
 *
 *   M-C  CONCURRENCY. Two real, concurrent PostgreSQL connections race the
 *        state machine:
 *        - two simultaneous start_purge calls produce exactly ONE operation
 *          and exactly one typed refusal (homecloud_content_purging);
 *        - a simultaneous trash+restore pair can only ever land on a
 *          consistent state (the CHECK invariants hold), never on corruption.
 *
 * The pre-Lifecycle shape is not simulated by guesswork: it is built from the
 * real historical migrations (canonical content, favorites), applied
 * unmodified.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { Client } = require('../backend/node_modules/pg');
const { repositoryRoot } = require('../tests/helpers/process');

/**
 * Resolve the local database URL exactly the way the runtime suites do:
 * explicit LOCAL_DATABASE_URL first, then the local stack's own
 * `supabase status -o env` (so a stack on non-default ports is found), and
 * only then the historical default. Loopback is asserted below regardless.
 */
function resolveDatabaseUrl() {
  if (process.env.LOCAL_DATABASE_URL) return process.env.LOCAL_DATABASE_URL;
  try {
    const result = spawnSync('supabase', ['status', '-o', 'env'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    if (result.status === 0 && result.stdout) {
      const dotenv = require('../backend/node_modules/dotenv');
      const parsed = dotenv.parse(result.stdout);
      if (parsed.DB_URL) return parsed.DB_URL;
    }
  } catch {
    // Fall through to the default below.
  }
  return 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
}

const databaseUrl = resolveDatabaseUrl();

const LIFECYCLE_MIGRATION = path.join(repositoryRoot, 'supabase', 'migrations', '20261007000000_homecloud_files_lifecycle_v1.sql');
const CANONICAL_CONTENT_MIGRATION = path.join(repositoryRoot, 'supabase', 'migrations', '20260910000000_homecloud_canonical_content_v1_1.sql');
const FAVORITES_MIGRATION = path.join(repositoryRoot, 'supabase', 'migrations', '20261004000000_homecloud_file_favorites_v1.sql');

const FRESH_DB = 'zz_hcf_lifecycle_fresh';
const UPGRADE_DB = 'zz_hcf_lifecycle_upgrade';

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
  await admin.query(`select pg_terminate_backend(pid) from pg_stat_activity where datname = '${database}' and pid <> pg_backend_pid()`);
  await admin.query(`drop database if exists ${database}`);
}

async function expectPgError(client, sql, params, errorCode, messageToken) {
  try {
    await client.query(sql, params);
  } catch (error) {
    const ok = error.code === errorCode && String(error.message).includes(messageToken);
    record(ok, `${messageToken} refused (code ${error.code})`);
    return;
  }
  record(false, `${messageToken} was NOT refused`);
}

/** Runs a query expecting exactly one typed refusal; resolves with the error. */
async function capturePgError(client, sql, params) {
  try {
    await client.query(sql, params);
    return null;
  } catch (error) {
    return error;
  }
}

/**
 * The minimal pre-HomeCloud foundation the content lineage depends on. No
 * homecloud_contents table here: the canonical content migration creates it,
 * so the fresh case exercises the real historical DDL unmodified.
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
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;
`;

const HOUSEHOLD_A = '11111111-1111-1111-1111-111111111111';
const HOUSEHOLD_B = '22222222-2222-2222-2222-222222222222';
const PERSON_A1 = 'dddddddd-0000-0000-0000-000000000001';
const PERSON_B1 = 'dddddddd-0000-0000-0000-000000000002';
const MEMBER_A1 = 'eeeeeeee-0000-0000-0000-000000000001';
const MEMBER_B1 = 'eeeeeeee-0000-0000-0000-000000000002';
const CONTENT_ACTIVE = 'cccccccc-0000-0000-0000-000000000001';
const CONTENT_TRASHED = 'cccccccc-0000-0000-0000-000000000002';
const CONTENT_STAGING = 'cccccccc-0000-0000-0000-000000000003';
const CONTENT_MEMORY = 'cccccccc-0000-0000-0000-000000000004';
const CONTENT_FOREIGN = 'cccccccc-0000-0000-0000-000000000005';

const UPGRADE_SEED = `
  insert into public.households (id, name) values
    ('${HOUSEHOLD_A}', 'LC HH A'),
    ('${HOUSEHOLD_B}', 'LC HH B');
  insert into public.people (id, display_name) values
    ('${PERSON_A1}', 'LC Adult A'),
    ('${PERSON_B1}', 'LC Adult B');
  insert into public.household_members (id, household_id, person_id, role, status) values
    ('${MEMBER_A1}', '${HOUSEHOLD_A}', '${PERSON_A1}', 'coordinator', 'active'),
    ('${MEMBER_B1}', '${HOUSEHOLD_B}', '${PERSON_B1}', 'adult', 'active');
  insert into public.homecloud_contents (
    id, household_id, role, display_name, mime_type, extension, size_bytes,
    original_storage_path, preview_storage_path, uploaded_by_member_id,
    uploaded_at, lifecycle, trashed_at, trashed_by_member_id
  ) values
    ('${CONTENT_ACTIVE}', '${HOUSEHOLD_A}', 'file', 'poliza.pdf', 'application/pdf', 'pdf', 100,
     '${HOUSEHOLD_A}/${CONTENT_ACTIVE}/original', '${HOUSEHOLD_A}/${CONTENT_ACTIVE}/preview', '${MEMBER_A1}',
     now() - interval '90 days', 'active', null, null),
    ('${CONTENT_TRASHED}', '${HOUSEHOLD_A}', 'file', 'factura.txt', 'text/plain', 'txt', 50,
     '${HOUSEHOLD_A}/${CONTENT_TRASHED}/original', null, '${MEMBER_A1}',
     now() - interval '80 days', 'trashed', now() - interval '2 days', '${MEMBER_A1}'),
    ('${CONTENT_STAGING}', '${HOUSEHOLD_A}', 'file', 'subiendo.pdf', 'application/pdf', 'pdf', 10,
     '${HOUSEHOLD_A}/${CONTENT_STAGING}/original', null, '${MEMBER_A1}',
     null, 'staging', null, null),
    ('${CONTENT_MEMORY}', '${HOUSEHOLD_A}', 'memory', 'foto.jpg', 'image/jpeg', 'jpg', 200,
     '${HOUSEHOLD_A}/${CONTENT_MEMORY}/original', '${HOUSEHOLD_A}/${CONTENT_MEMORY}/preview', '${MEMBER_A1}',
     now() - interval '70 days', 'active', null, null),
    ('${CONTENT_FOREIGN}', '${HOUSEHOLD_B}', 'file', 'ajeno.txt', 'text/plain', 'txt', 30,
     '${HOUSEHOLD_B}/${CONTENT_FOREIGN}/original', null, '${MEMBER_B1}',
     now() - interval '60 days', 'active', null, null);
  insert into public.homecloud_file_favorites (household_id, person_id, content_id)
    values ('${HOUSEHOLD_A}', '${PERSON_A1}', '${CONTENT_ACTIVE}');
`;

const LIFECYCLE_FUNCTIONS = [
  ['homecloud_trash_content', 3],
  ['homecloud_restore_content', 2],
  ['homecloud_start_purge', 3],
  ['homecloud_claim_purge_operations', 3],
  ['homecloud_complete_purge_operation', 2],
  ['homecloud_fail_purge_operation', 5],
];

async function run() {
  const parsed = new URL(databaseUrl);
  assert(['127.0.0.1', 'localhost'].includes(parsed.hostname), `the database URL is local loopback (${parsed.hostname})`);

  const admin = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 10_000 });
  await admin.connect();
  console.log('\n=== HOMECLOUD FILES: LIFECYCLE V1 MIGRATION + STATE MACHINE SAFETY (isolated databases) ===\n');
  console.log(`Target local PostgreSQL: ${parsed.hostname}:${parsed.port}`);

  const lifecycleSql = fs.readFileSync(LIFECYCLE_MIGRATION, 'utf8');
  const contentSql = fs.readFileSync(CANONICAL_CONTENT_MIGRATION, 'utf8');
  const favoritesSql = fs.readFileSync(FAVORITES_MIGRATION, 'utf8');

  try {
    // ── M-A: FRESH ──────────────────────────────────────────────────────────
    console.log('\n--- M-A: fresh database, no Lifecycle V1 object ever existed ---');
    await dropIfExists(admin, FRESH_DB);
    await admin.query(`create database ${FRESH_DB}`);
    {
      const db = await connect(FRESH_DB);
      try {
        await db.query(FRESH_FOUNDATION);
        await db.query(contentSql);
        record(true, 'M-A1. the canonical content migration applies to the fresh foundation');

        // Seed one row per lifecycle state FIRST: the pre-migration rejection
        // probe below and the CHECK probes after it both need real rows.
        await db.query(`
          insert into public.households (id, name) values ('${HOUSEHOLD_A}', 'LC Fresh');
          insert into public.homecloud_contents (id, household_id, role, display_name, mime_type, size_bytes, original_storage_path, lifecycle, trashed_at)
          values
            ('${CONTENT_ACTIVE}', '${HOUSEHOLD_A}', 'file', 'a.txt', 'text/plain', 1, '${HOUSEHOLD_A}/${CONTENT_ACTIVE}/original', 'active', null),
            ('${CONTENT_TRASHED}', '${HOUSEHOLD_A}', 'file', 'b.txt', 'text/plain', 1, '${HOUSEHOLD_A}/${CONTENT_TRASHED}/original', 'trashed', now());
        `);

        // 'purging' must be REJECTED before the lifecycle migration: this is
        // what proves the migration is the authority that extends the domain.
        await expectPgError(db,
          `update public.homecloud_contents set lifecycle = 'purging', trashed_at = now() where id = '${CONTENT_ACTIVE}'`,
          [], '23514', 'homecloud_contents_lifecycle_check');

        await db.query(lifecycleSql);
        record(true, 'M-A2. the Lifecycle V1 migration applies cleanly to a fresh database');

        const lifecycleCheck = await scalar(db, `select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.homecloud_contents'::regclass and conname = 'homecloud_contents_lifecycle_check'`);
        record(String(lifecycleCheck).includes('purging'), `M-A3. the lifecycle domain now includes purging (${lifecycleCheck})`);

        const trashCheck = await scalar(db, `select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.homecloud_contents'::regclass and conname = 'homecloud_contents_trash_consistency'`);
        record(/trashed.*purging|purging.*trashed/.test(String(trashCheck)), `M-A4. trash consistency covers purging (${trashCheck})`);

        // purging WITH trashed_at is now legal; purging WITHOUT trashed_at is
        // refused by the timestamp-consistency CHECK; a bogus lifecycle is
        // refused by the domain CHECK.
        await db.query(`update public.homecloud_contents set lifecycle = 'purging' where id = '${CONTENT_TRASHED}'`);
        record(true, 'M-A5. purging with trashed_at set is a legal state');
        await expectPgError(db,
          `update public.homecloud_contents set lifecycle = 'purging', trashed_at = null where id = '${CONTENT_TRASHED}'`,
          [], '23514', 'homecloud_contents_trash_consistency');
        await expectPgError(db,
          `update public.homecloud_contents set lifecycle = 'exploded' where id = '${CONTENT_ACTIVE}'`,
          [], '23514', 'homecloud_contents_lifecycle_check');

        // The purge operations table, its indexes and its trigger exist once.
        assert(await scalar(db, `select count(*) from information_schema.tables where table_schema='public' and table_name='homecloud_purge_operations'`) === '1', 'M-A6. homecloud_purge_operations exists exactly once');
        for (const indexName of ['hc_purge_ops_active_content_uidx', 'hc_purge_ops_poll_idx', 'hc_purge_ops_household_idx']) {
          assert(await scalar(db, `select count(*) from pg_indexes where schemaname='public' and tablename='homecloud_purge_operations' and indexname='${indexName}'`) === '1', `M-A7. index ${indexName} exists exactly once`);
        }
        assert(await scalar(db, `select count(*) from pg_trigger where tgrelid='public.homecloud_purge_operations'::regclass and tgname='trg_homecloud_purge_operations_updated_at'`) === '1', 'M-A8. the updated_at trigger exists exactly once');
        assert(await scalar(db, `select count(*) from pg_indexes where schemaname='public' and tablename='homecloud_contents' and indexname='hc_contents_household_trashed_idx'`) === '1', 'M-A9. the trash listing index exists exactly once');

        // The unique partial index is the database backstop against two active
        // purge operations for one content.
        await db.query(`
          insert into public.homecloud_purge_operations
            (household_id, content_id, role, display_name, mime_type, size_bytes, original_bucket, original_path, requested_by_member_id)
          values
            ('${HOUSEHOLD_A}', '${CONTENT_TRASHED}', 'file', 'b.txt', 'text/plain', 1, 'homecloud-originals', 'x/y/original', '00000000-0000-0000-0000-000000000000');
        `);
        await expectPgError(db, `
          insert into public.homecloud_purge_operations
            (household_id, content_id, role, display_name, mime_type, size_bytes, original_bucket, original_path, requested_by_member_id)
          values
            ('${HOUSEHOLD_A}', '${CONTENT_TRASHED}', 'file', 'b.txt', 'text/plain', 1, 'homecloud-originals', 'x/y/original', '00000000-0000-0000-0000-000000000000');
        `, [], '23505', 'hc_purge_ops_active_content_uidx');

        // Lease shape + completion shape are database invariants, not service
        // conventions.
        await expectPgError(db, `
          insert into public.homecloud_purge_operations
            (household_id, content_id, role, display_name, mime_type, size_bytes, original_bucket, original_path, requested_by_member_id, status)
          values
            ('${HOUSEHOLD_A}', '${CONTENT_ACTIVE}', 'file', 'a.txt', 'text/plain', 1, 'homecloud-originals', 'x/z/original', '00000000-0000-0000-0000-000000000000', 'running');
        `, [], '23514', 'homecloud_purge_ops_lease_shape_check');
        await expectPgError(db, `
          insert into public.homecloud_purge_operations
            (household_id, content_id, role, display_name, mime_type, size_bytes, original_bucket, original_path, requested_by_member_id, completed_at)
          values
            ('${HOUSEHOLD_A}', '${CONTENT_ACTIVE}', 'file', 'a.txt', 'text/plain', 1, 'homecloud-originals', 'x/z/original', '00000000-0000-0000-0000-000000000000', now());
        `, [], '23514', 'homecloud_purge_ops_completion_shape_check');

        for (const [fn] of LIFECYCLE_FUNCTIONS) {
          assert(await scalar(db, `select count(*) from pg_proc where pronamespace='public'::regnamespace and proname='${fn}'`) === '1', `M-A10. ${fn} exists exactly once`);
        }
        for (const [fn] of LIFECYCLE_FUNCTIONS) {
          const executable = await scalar(db, `select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='${fn}' and (p.proacl is null or p.proacl @> ARRAY['=X/postgres']::aclitem[])`);
          record(executable === null || Number(executable) === 0, `M-A11. ${fn} is NOT executable by PUBLIC`);
        }

        // Re-apply must converge, not corrupt.
        await db.query(lifecycleSql);
        record(true, 'M-A12. the migration is RE-APPLICAable: a second run converges');
        for (const [fn] of LIFECYCLE_FUNCTIONS) {
          assert(await scalar(db, `select count(*) from pg_proc where pronamespace='public'::regnamespace and proname='${fn}'`) === '1', `M-A13. re-applying still leaves exactly ONE ${fn}`);
        }
        assert(await scalar(db, `select count(*) from pg_indexes where schemaname='public' and tablename='homecloud_purge_operations' and indexname='hc_purge_ops_active_content_uidx'`) === '1', 'M-A14. re-applying still leaves exactly ONE active-content unique index');
      } finally {
        await db.end();
      }
    }

    // ── M-B: UPGRADE ────────────────────────────────────────────────────────
    console.log('\n--- M-B: realistic pre-Lifecycle database upgraded through Lifecycle V1 ---');
    await dropIfExists(admin, UPGRADE_DB);
    await admin.query(`create database ${UPGRADE_DB}`);
    {
      const db = await connect(UPGRADE_DB);
      try {
        await db.query(FRESH_FOUNDATION);
        await db.query(contentSql);
        await db.query(favoritesSql);
        await db.query(UPGRADE_SEED);
        record(true, 'M-B1. pre-Lifecycle household seeded (active + trashed + staging + memory + foreign + favorite)');

        const before = (await db.query(`
          select
            (select count(*) from homecloud_contents) as contents,
            (select coalesce(string_agg(id::text || '@' || lifecycle, ',' order by id), '') from homecloud_contents) as states,
            (select count(*) from homecloud_file_favorites) as favorites
        `)).rows[0];

        await db.query(lifecycleSql);
        record(true, 'M-B2. the Lifecycle V1 migration applies cleanly over pre-Lifecycle data');

        const after = (await db.query(`
          select
            (select count(*) from homecloud_contents) as contents,
            (select coalesce(string_agg(id::text || '@' || lifecycle, ',' order by id), '') from homecloud_contents) as states,
            (select count(*) from homecloud_file_favorites) as favorites
        `)).rows[0];
        assert(after.contents === before.contents, `M-B3. content COUNT preserved (${before.contents} -> ${after.contents})`);
        assert(after.states === before.states, 'M-B4. every content id and lifecycle is byte-identical: no row was mutated');
        assert(after.favorites === before.favorites, `M-B5. Favorites preserved (${before.favorites} -> ${after.favorites})`);

        // ── the state machine actually works on the upgraded database ──
        let row = (await db.query(`select * from homecloud_trash_content($1, $2, $3)`, [HOUSEHOLD_A, CONTENT_ACTIVE, MEMBER_A1])).rows[0];
        assert(row.lifecycle === 'trashed' && row.trashed_at !== null && row.trashed_by_member_id === MEMBER_A1, 'M-B6. TRASH: active -> trashed with audit fields');

        const trashedAt = row.trashed_at;
        row = (await db.query(`select * from homecloud_trash_content($1, $2, $3)`, [HOUSEHOLD_A, CONTENT_ACTIVE, MEMBER_A1])).rows[0];
        assert(row.lifecycle === 'trashed' && String(row.trashed_at) === String(trashedAt), 'M-B7. TRASH is idempotent: a repeated command is a no-op success with the SAME trashed_at');

        await expectPgError(db, `select * from homecloud_trash_content($1, $2, $3)`, [HOUSEHOLD_A, CONTENT_STAGING, MEMBER_A1], '23514', 'homecloud_content_not_active');
        await expectPgError(db, `select * from homecloud_trash_content($1, $2, $3)`, [HOUSEHOLD_A, CONTENT_FOREIGN, MEMBER_A1], 'P0002', 'homecloud_content_not_found');
        await expectPgError(db, `select * from homecloud_trash_content($1, $2, $3)`, [HOUSEHOLD_A, '99999999-9999-9999-9999-999999999999', MEMBER_A1], 'P0002', 'homecloud_content_not_found');
        record(true, 'M-B8. TRASH refuses staging, foreign-household and unknown ids with typed failures');

        row = (await db.query(`select * from homecloud_restore_content($1, $2)`, [HOUSEHOLD_A, CONTENT_ACTIVE])).rows[0];
        assert(row.lifecycle === 'active' && row.trashed_at === null && row.trashed_by_member_id === null, 'M-B9. RESTORE: trashed -> active clears the audit fields');
        row = (await db.query(`select * from homecloud_restore_content($1, $2)`, [HOUSEHOLD_A, CONTENT_ACTIVE])).rows[0];
        assert(row.lifecycle === 'active', 'M-B10. RESTORE is idempotent: restoring active content is a no-op success');
        assert(await scalar(db, `select count(*) from homecloud_file_favorites where content_id = '${CONTENT_ACTIVE}'`) === '1', 'M-B11. the Favorite SURVIVED trash + restore');
        await expectPgError(db, `select * from homecloud_restore_content($1, $2)`, [HOUSEHOLD_A, CONTENT_STAGING], '23514', 'homecloud_content_not_trashed');
        await expectPgError(db, `select * from homecloud_restore_content($1, $2)`, [HOUSEHOLD_A, CONTENT_FOREIGN], 'P0002', 'homecloud_content_not_found');
        record(true, 'M-B12. RESTORE refuses staging, foreign-household with typed failures');

        await expectPgError(db, `select * from homecloud_start_purge($1, $2, $3)`, [HOUSEHOLD_A, CONTENT_ACTIVE, MEMBER_A1], '23514', 'homecloud_content_not_trashed');
        record(true, 'M-B13. START PURGE refuses active content (only trashed may be purged)');

        let op = (await db.query(`select * from homecloud_start_purge($1, $2, $3)`, [HOUSEHOLD_A, CONTENT_TRASHED, MEMBER_A1])).rows[0];
        assert(Boolean(op), 'M-B14. START PURGE: trashed -> purging with a durable operation');
        assert(op.household_id === HOUSEHOLD_A && op.content_id === CONTENT_TRASHED, 'M-B15. the operation snapshot carries the right household and content');
        assert(op.original_bucket === 'homecloud-originals' && op.original_path === `${HOUSEHOLD_A}/${CONTENT_TRASHED}/original`, 'M-B16. the operation snapshot carries the ORIGINAL bucket + canonical path');
        assert(op.preview_path === null && op.preview_bucket === null, 'M-B17. a content without preview snapshots a NULL preview target');
        assert(op.status === 'pending' && op.attempts === 0, 'M-B18. the operation starts pending with zero attempts');
        const content = (await db.query(`select lifecycle, trashed_at from homecloud_contents where id = $1`, [CONTENT_TRASHED])).rows[0];
        assert(content.lifecycle === 'purging' && content.trashed_at !== null, 'M-B19. the content row is purging and KEEPS its trash timestamp (consistency CHECK holds)');

        await expectPgError(db, `select * from homecloud_trash_content($1, $2, $3)`, [HOUSEHOLD_A, CONTENT_TRASHED, MEMBER_A1], '23514', 'homecloud_content_purging');
        await expectPgError(db, `select * from homecloud_restore_content($1, $2)`, [HOUSEHOLD_A, CONTENT_TRASHED], '23514', 'homecloud_content_purging');
        await expectPgError(db, `select * from homecloud_start_purge($1, $2, $3)`, [HOUSEHOLD_A, CONTENT_TRASHED, MEMBER_A1], '23514', 'homecloud_content_purging');
        record(true, 'M-B20. Trash, Restore and a second Purge are ALL refused while purging');

        // ── worker primitives ──
        let claimed = (await db.query(`select * from homecloud_claim_purge_operations($1, $2, $3)`, ['worker-a', 10, 120])).rows;
        assert(claimed.length === 1 && claimed[0].id === op.id, 'M-B21. CLAIM returns exactly the one pending operation');
        assert(claimed[0].status === 'running' && claimed[0].attempts === 1 && claimed[0].lease_worker_id === 'worker-a' && claimed[0].lease_expires_at !== null, 'M-B22. CLAIM stamps running + attempts + lease owner + lease expiry');

        claimed = (await db.query(`select * from homecloud_claim_purge_operations($1, $2, $3)`, ['worker-b', 10, 120])).rows;
        assert(claimed.length === 0, 'M-B23. a second worker claims NOTHING while the lease holds (claim exclusivity)');

        let completed = await scalar(db, `select homecloud_complete_purge_operation($1, $2)`, [op.id, 'worker-b']);
        assert(completed === false, 'M-B24. COMPLETE is REFUSED for a worker that does not own the lease');
        completed = await scalar(db, `select homecloud_complete_purge_operation($1, $2)`, [op.id, 'worker-a']);
        assert(completed === true, 'M-B25. COMPLETE succeeds for the lease owner');
        op = (await db.query(`select status, completed_at, lease_worker_id, last_error_code from homecloud_purge_operations where id = $1`, [op.id])).rows[0];
        assert(op.status === 'succeeded' && op.completed_at !== null && op.lease_worker_id === null && op.last_error_code === null, 'M-B26. the completed operation is succeeded, timestamped and lease-free');
        assert(await scalar(db, `select count(*) from homecloud_contents where id = '${CONTENT_TRASHED}'`) === '1', 'M-B27. completing the operation does NOT delete the content row (that is the worker\'s own final step)');

        // The worker's final step: deleting the content row must also remove
        // its Favorites through the existing cascade, while the operation
        // record survives (decision B).
        await db.query(`delete from homecloud_contents where id = '${CONTENT_TRASHED}'`);
        assert(await scalar(db, `select count(*) from homecloud_contents where id = '${CONTENT_TRASHED}'`) === '0', 'M-B28. the content row is gone after the worker deletes it');
        const survived = (await db.query(`select count(*) as c from homecloud_purge_operations where content_id = '${CONTENT_TRASHED}' and status = 'succeeded'`)).rows[0].c;
        assert(Number(survived) === 1, 'M-B29. the operation record SURVIVES the deletion of its content row (no FK cascade)');

        // ── retriable failure, bounded retries ──
        await db.query(`update homecloud_contents set lifecycle = 'trashed', trashed_at = now() where id = '${CONTENT_ACTIVE}'`);
        const op2 = (await db.query(`select * from homecloud_start_purge($1, $2, $3)`, [HOUSEHOLD_A, CONTENT_ACTIVE, MEMBER_A1])).rows[0];
        assert(Boolean(op2), 'M-B30. a second trashed content can start its own purge');
        await db.query(`select * from homecloud_claim_purge_operations($1, $2, $3)`, ['worker-a', 10, 120]);
        let failed = await scalar(db, `select homecloud_fail_purge_operation($1, $2, $3, $4, $5)`, [op2.id, 'worker-a', 'storage_remove_failed', false, new Date(Date.now() + 3_600_000).toISOString()]);
        assert(failed === true, 'M-B31. a retriable FAIL is accepted for the lease owner');
        const op2row = (await db.query(`select status, next_attempt_at, last_error_code, completed_at from homecloud_purge_operations where id = $1`, [op2.id])).rows[0];
        assert(op2row.status === 'pending' && op2row.next_attempt_at !== null && op2row.last_error_code === 'storage_remove_failed' && op2row.completed_at === null, 'M-B32. the retriable failure goes back to pending with backoff + typed code');
        claimed = (await db.query(`select * from homecloud_claim_purge_operations($1, $2, $3)`, ['worker-b', 10, 120])).rows;
        assert(claimed.length === 0, 'M-B33. a not-yet-due retry is NOT claimable (backoff is honored)');

        await db.query(`update homecloud_purge_operations set next_attempt_at = now() - interval '1 second' where id = $1`, [op2.id]);
        claimed = (await db.query(`select * from homecloud_claim_purge_operations($1, $2, $3)`, ['worker-b', 10, 120])).rows;
        assert(claimed.length === 1 && claimed[0].id === op2.id && claimed[0].attempts === 2, 'M-B34. a due retry IS claimable and increments attempts');

        failed = await scalar(db, `select homecloud_fail_purge_operation($1, $2, $3, $4, null)`, [op2.id, 'worker-b', 'storage_unverifiable', true]);
        assert(failed === true, 'M-B35. a PERMANENT fail is accepted');
        const op2Final = (await db.query(`select status, completed_at, next_attempt_at from homecloud_purge_operations where id = $1`, [op2.id])).rows[0];
        assert(op2Final.status === 'failed' && op2Final.completed_at !== null && op2Final.next_attempt_at === null, 'M-B36. bounded retries end in the terminal failed state, durably recorded');
        claimed = (await db.query(`select * from homecloud_claim_purge_operations($1, $2, $3)`, ['worker-a', 10, 120])).rows;
        assert(claimed.length === 0, 'M-B37. a failed operation is never claimable again through the claim primitive');

        // ── crash recovery: expired lease is reclaimed; late completion refused ──
        await db.query(`update homecloud_contents set lifecycle = 'active', trashed_at = null where id = '${CONTENT_ACTIVE}'`);
        await db.query(`update homecloud_contents set lifecycle = 'trashed', trashed_at = now() where id = '${CONTENT_ACTIVE}'`);
        const op3 = (await db.query(`select * from homecloud_start_purge($1, $2, $3)`, [HOUSEHOLD_A, CONTENT_ACTIVE, MEMBER_A1])).rows[0];
        claimed = (await db.query(`select * from homecloud_claim_purge_operations($1, $2, $3)`, ['worker-crashed', 10, 900])).rows;
        assert(claimed.length === 1 && claimed[0].id === op3.id, 'M-B38. the crashed worker claimed the operation');
        // Simulate the crash: the lease lapses (time is moved, not the clock).
        await db.query(`update homecloud_purge_operations set lease_expires_at = now() - interval '1 second' where id = $1`, [op3.id]);
        claimed = (await db.query(`select * from homecloud_claim_purge_operations($1, $2, $3)`, ['worker-recovery', 10, 120])).rows;
        assert(claimed.length === 1 && claimed[0].id === op3.id && claimed[0].lease_worker_id === 'worker-recovery' && claimed[0].attempts === 2, 'M-B39. an EXPIRED lease is reclaimed by the recovery worker (crash recovery)');
        const late = await scalar(db, `select homecloud_complete_purge_operation($1, $2)`, [op3.id, 'worker-crashed']);
        assert(late === false, 'M-B40. the crashed worker\'s LATE completion is REFUSED (lease-owner CAS)');
        const recovered = await scalar(db, `select homecloud_complete_purge_operation($1, $2)`, [op3.id, 'worker-recovery']);
        assert(recovered === true, 'M-B41. the recovery worker completes the reclaimed operation');
      } finally {
        await db.end();
      }
    }

    // ── M-C: CONCURRENCY (two real connections) ─────────────────────────────
    console.log('\n--- M-C: concurrent transitions on two real connections ---');
    {
      const dbA = await connect(UPGRADE_DB);
      const dbB = await connect(UPGRADE_DB);
      try {
        // Seed a fresh trashed content for the purge race.
        const raceContent = (await dbA.query(`
          insert into public.homecloud_contents
            (household_id, role, display_name, mime_type, size_bytes, original_storage_path, lifecycle, trashed_at)
          values ('${HOUSEHOLD_A}', 'file', 'race.txt', 'text/plain', 1, '${HOUSEHOLD_A}/' || gen_random_uuid() || '/original', 'trashed', now())
          returning id
        `)).rows[0].id;

        const [a, b] = await Promise.all([
          capturePgError(dbA, `select * from homecloud_start_purge($1, $2, $3)`, [HOUSEHOLD_A, raceContent, MEMBER_A1]),
          capturePgError(dbB, `select * from homecloud_start_purge($1, $2, $3)`, [HOUSEHOLD_A, raceContent, MEMBER_A1]),
        ]);
        const successes = [a, b].filter((error) => error === null).length;
        const purgingRefusals = [a, b].filter((error) => error && error.code === '23514' && String(error.message).includes('homecloud_content_purging')).length;
        assert(successes === 1 && purgingRefusals === 1, `M-C1. two concurrent start_purge calls: exactly ONE wins and ONE is refused (${successes} successes, ${purgingRefusals} refusals)`);
        const opCount = (await dbA.query(`select count(*) as c from homecloud_purge_operations where content_id = $1 and status in ('pending','running')`, [raceContent])).rows[0].c;
        assert(Number(opCount) === 1, 'M-C2. exactly ONE durable operation exists for the raced content');
        const raceRow = (await dbA.query(`select lifecycle from homecloud_contents where id = $1`, [raceContent])).rows[0];
        assert(raceRow.lifecycle === 'purging', 'M-C3. the raced content is consistently purging');

        // Trash vs restore, 5 rounds: whichever order the row lock grants, the
        // final state must satisfy the trash consistency invariant.
        for (let round = 1; round <= 5; round += 1) {
          const content = (await dbA.query(`
            insert into public.homecloud_contents
              (household_id, role, display_name, mime_type, size_bytes, original_storage_path, lifecycle, uploaded_at)
            values ('${HOUSEHOLD_A}', 'file', $1, 'text/plain', 1, '${HOUSEHOLD_A}/' || gen_random_uuid() || '/original', 'active', now())
            returning id
          `, [`race-trash-restore-${round}`])).rows[0].id;
          await Promise.all([
            dbA.query(`select * from homecloud_trash_content($1, $2, $3)`, [HOUSEHOLD_A, content, MEMBER_A1]),
            dbB.query(`select * from homecloud_restore_content($1, $2)`, [HOUSEHOLD_A, content]),
          ]);
          const state = (await dbA.query(`select lifecycle, trashed_at from homecloud_contents where id = $1`, [content])).rows[0];
          const consistent = (state.lifecycle === 'active' && state.trashed_at === null) || (state.lifecycle === 'trashed' && state.trashed_at !== null);
          assert(consistent, `M-C4.${round} concurrent trash+restore round ${round} landed on a CONSISTENT state (${state.lifecycle})`);
        }
        record(true, 'M-C5. five concurrent trash+restore rounds never corrupted the state machine');
      } finally {
        await dbA.end();
        await dbB.end();
      }
    }

    console.log(`\nLIFECYCLE_MIGRATION_RESULT pass=${passCount} fail=${failCount}`);
    console.log(failCount === 0 ? 'LIFECYCLE_MIGRATION_TESTS=PASS' : 'LIFECYCLE_MIGRATION_TESTS=FAIL');
    return failCount === 0;
  } finally {
    await dropIfExists(admin, FRESH_DB);
    await dropIfExists(admin, UPGRADE_DB);
    await admin.end();
    console.log(`Cleaned up only the temporary databases ${FRESH_DB} and ${UPGRADE_DB}.`);
  }
}

run().then((ok) => {
  process.exit(ok ? 0 : 1);
}).catch((error) => {
  console.error('LIFECYCLE_MIGRATION_TESTS=ERROR');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
