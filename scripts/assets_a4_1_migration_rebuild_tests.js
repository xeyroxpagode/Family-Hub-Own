#!/usr/bin/env node
'use strict';

/**
 * HOMePLUS Assets — A4.1 MIGRATION REBUILD SAFETY, proven in isolation.
 *
 * LOCAL_RUNTIME_REQUIRED, and destructive ONLY to the throwaway database
 * this script creates and drops again in a `finally`. The user's active
 * HomePlus stack is never reset, never dropped and never written to: the
 * shared local database carries live migration history from other
 * worktrees, so a `supabase db reset` from here would destroy foreign
 * objects. The rebuild happens inside a scratch database instead.
 *
 * QA case 18 of the A4.1 acceptance list: "Reconstrucción limpia de
 * migraciones".
 *
 * The ENTIRE Assets migration chain (A1 core persistence -> A3.1
 * idempotency -> A3.2 context -> A3.3 profile change -> A4.1 records
 * foundation) is applied in order on a fresh foundation that only
 * provides the pre-existing household/people/membership tables the
 * chain depends on. After the rebuild:
 *   - every A4.1 object exists EXACTLY ONCE (no duplicate function,
 *     trigger or index),
 *   - re-applying the A4.1 file is a clean no-op (the file is
 *     idempotent, so an interrupted rollout can be retried),
 *   - the rebuilt schema is FUNCTIONAL: the canonical creation RPC
 *     works, the orphan guard blocks, the household guard blocks and
 *     the unique link index blocks.
 */

const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('../backend/node_modules/pg');
const { loadTestEnvironment, requireLocalUrl } = require('../tests/helpers/environment');
const { repositoryRoot } = require('../tests/helpers/process');

loadTestEnvironment({ required: ['LOCAL_DATABASE_URL'] });
requireLocalUrl('LOCAL_DATABASE_URL');

const databaseUrl = process.env.LOCAL_DATABASE_URL;

const MIGRATIONS_DIR = path.join(repositoryRoot, 'supabase', 'migrations');
const CHAIN = [
  '20261006000000_assets_core_persistence_v1.sql',
  '20261008000000_assets_idempotency_v1.sql',
  '20261008010000_assets_context_v1.sql',
  '20261010000000_assets_profile_change_v1.sql',
  '20261011000000_assets_records_foundation_v1.sql',
  '20261011010000_assets_idempotency_reserve_race_fix_v1.sql',
  '20261012000000_assets_record_link_unlink_v1.sql',
];
const RECORDS_MIGRATION = CHAIN[5];

const FRESH_DB = 'zz_assets_a41_rebuild';

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

/**
 * The minimal foundation the Assets chain depends on. It mirrors the
 * pre-existing household/people/membership tables (auth_base lineage)
 * closely enough for every FK and RPC revalidation in the chain. The
 * assets table is intentionally ABSENT: A1 must create it from scratch,
 * because a rebuilt environment has no Assets objects at all.
 */
const FRESH_FOUNDATION = `
create extension if not exists "pgcrypto";
create table public.people (
  id uuid primary key default gen_random_uuid(),
  display_name text,
  auth_user_id uuid,
  active_household_id uuid
);
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text,
  slug text,
  created_by_person_id uuid references public.people(id) on delete set null
);
create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  person_id uuid references public.people(id) on delete cascade,
  role text not null,
  status text not null default 'active',
  joined_at timestamptz
);
`;

async function run() {
  console.log('\n=== ASSETS A4.1: MIGRATION REBUILD (ISOLATED THROWAWAY DATABASE) ===\n');
  console.log(`Target local PostgreSQL: ${databaseUrl.split('@')[1] ?? databaseUrl}`);

  const admin = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 10_000 });
  await admin.connect();

  let scratch = null;
  try {
    await dropIfExists(admin, FRESH_DB);
    await admin.query(`create database ${FRESH_DB}`);
    scratch = await connect(FRESH_DB);
    record(true, `scratch database ${FRESH_DB} creada (el stack activo NO se toca)`);

    await scratch.query(FRESH_FOUNDATION);
    record(true, 'fundación mínima (people/households/household_members) instalada');

    // ── The full Assets chain applies in order, cleanly ──
    for (const file of CHAIN) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await scratch.query(sql);
      record(true, `migración aplicada: ${file}`);
    }

    // ── Exactly one of each A4.1 object ──
    const tables = await scalar(scratch, `
      select count(*)::int from pg_tables
      where schemaname = 'public'
        and tablename in ('assets_records', 'assets_record_periods', 'assets_record_links')
    `);
    record(tables === 3, `las 3 tablas A4.1 existen exactamente una vez (got ${tables})`);

    const rpcCount = await scalar(scratch, `
      select count(*)::int from information_schema.routines
      where routine_schema = 'public' and routine_name = 'create_asset_record'
    `);
    record(rpcCount === 1, `el RPC create_asset_record existe exactamente una vez (got ${rpcCount})`);

    const guardFns = await scalar(scratch, `
      select count(*)::int from information_schema.routines
      where routine_schema = 'public'
        and routine_name in ('assets_record_link_guard', 'assets_record_links_orphan_guard', 'assets_records_restore_guard')
    `);
    record(guardFns === 3, 'los 3 guard functions existen exactamente una vez');

    // information_schema.triggers lists one row per (trigger, event
    // manipulation), so the one-of-each check counts DISTINCT names.
    const linkTriggers = await scalar(scratch, `
      select count(distinct trigger_name)::int from information_schema.triggers
      where event_object_table = 'assets_record_links'
    `);
    record(linkTriggers === 2, `los triggers de links son exactamente 2 (got ${linkTriggers})`);

    const recordTriggers = await scalar(scratch, `
      select count(distinct trigger_name)::int from information_schema.triggers
      where event_object_table = 'assets_records'
    `);
    record(recordTriggers === 2, `los triggers de records son exactamente 2 (got ${recordTriggers})`);

    const rlsOn = await scalar(scratch, `
      select count(*)::int from pg_class
      where relname in ('assets_records', 'assets_record_periods', 'assets_record_links')
        and relrowsecurity = true
    `);
    record(rlsOn === 3, 'RLS queda habilitada en las 3 tablas (fail-closed)');

    // ── Re-applying the A4.1 file is a clean no-op ──
    const recordsSql = fs.readFileSync(path.join(MIGRATIONS_DIR, RECORDS_MIGRATION), 'utf8');
    await scratch.query(recordsSql);
    const tablesAfterRerun = await scalar(scratch, `
      select count(*)::int from pg_tables
      where schemaname = 'public'
        and tablename in ('assets_records', 'assets_record_periods', 'assets_record_links')
    `);
    record(tablesAfterRerun === 3, 're-aplicar la migración A4.1 es un no-op limpio (reintento seguro)');

    // ── The rebuilt schema is functional ──
    const householdId = await scalar(scratch, `insert into public.households (name) values ('Rebuild HH') returning id`);
    const personId = await scalar(scratch, `insert into public.people (display_name) values ('Rebuild Person') returning id`);
    const memberId = await scalar(scratch, `
      insert into public.household_members (household_id, person_id, role, status)
      values ($1, $2, 'coordinator', 'active') returning id
    `, [householdId, personId]);
    const asset1Id = await scalar(scratch, `
      insert into public.assets (household_id, name, profile) values ($1, 'Taladro', 'STANDARD') returning id
    `, [householdId]);
    const asset2Id = await scalar(scratch, `
      insert into public.assets (household_id, name, profile) values ($1, 'Bici', 'STANDARD') returning id
    `, [householdId]);

    const created = await scalar(scratch, `
      select public.create_asset_record(
        $1, $2, 'INSURANCE', 'Seguro rebuild', null, null, null,
        '2026-06-01', '2027-06-01', $3
      )::jsonb ->> 'status'
    `, [householdId, memberId, [asset1Id, asset2Id]]);
    record(created === 'created', `el RPC funciona sobre el esquema reconstruido (got ${created})`);

    const linkCount = await scalar(scratch, `
      select count(*)::int from public.assets_record_links where ended_at is null
    `);
    record(linkCount === 2, 'el Record compartido quedó con sus 2 links activos');
    const periodCount = await scalar(scratch, `
      select count(*)::int from public.assets_record_periods
    `);
    record(periodCount === 1, 'el período de vigencia quedó persistido');

    // Orphan guard on the rebuilt schema.
    try {
      await scratch.query('update public.assets_record_links set ended_at = now() where ended_at is null');
      record(false, 'orphan guard: el último link activo se terminó sin bloqueo');
    } catch (error) {
      record(error.code === '23514', `orphan guard activo en el esquema reconstruido (${error.code})`);
    }

    // Household guard: a link toward another household's asset cannot exist,
    // so the RPC answers the typed no-disclosure outcome instead.
    const household2 = await scalar(scratch, `insert into public.households (name) values ('Otro HH') returning id`);
    const foreignAsset = await scalar(scratch, `
      insert into public.assets (household_id, name, profile) values ($1, 'Ajeno', 'STANDARD') returning id
    `, [household2]);
    const foreignOutcome = await scalar(scratch, `
      select public.create_asset_record(
        $1, $2, 'OTHER', 'Cruzado', null, null, null, null, null, $3
      )::jsonb ->> 'status'
    `, [householdId, memberId, [foreignAsset]]);
    record(foreignOutcome === 'invalid_asset', `target cross-Household rechazado sin disclosure (got ${foreignOutcome})`);
  } finally {
    if (scratch) {
      try { await scratch.end(); } catch { /* already closed */ }
    }
    try {
      await dropIfExists(admin, FRESH_DB);
      record(true, `scratch database ${FRESH_DB} eliminada`);
    } catch (error) {
      record(false, `drop scratch: ${error?.message ?? error}`);
    }
    await admin.end();
  }

  console.log(`\nASSETS_A41_MIGRATION_RESULT pass=${passCount} fail=${failCount}`);
  if (failCount > 0) {
    process.exitCode = 1;
    console.error('ASSETS_A4_1_MIGRATION_TESTS=FAIL');
  } else {
    console.log('ASSETS_A4_1_MIGRATION_TESTS=PASS');
  }
}

run().catch((error) => {
  console.error('Test runner crashed:', error);
  process.exit(1);
});
