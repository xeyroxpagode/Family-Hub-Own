#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { Client } = require('C:\\Users\\thega\\Desktop\\HomePlus\\backend\\node_modules\\pg');

const DATABASE_URL = process.env.LOCAL_DATABASE_URL
  || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const parsed = new URL(DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
  console.error('REMOTE_DATABASE_BLOCKED');
  process.exit(1);
}

const PREFIX = 'qa_m11_int_01_p2_r1_f06_';
const TARGET_BEFORE = '20260722010000';
const INTEGRATION_ROOT = 'C:\\Users\\thega\\Desktop\\HomePlus-worktrees\\integration';

function check(cond, msg, details) {
  assert.ok(cond, details ? `${msg}: ${JSON.stringify(details)}` : msg);
  console.log(`PASS ${msg}${details ? ' ' + JSON.stringify(details) : ''}`);
}

function supa(args) {
  const useWindowsShim = process.platform === 'win32';
  const executable = useWindowsShim ? (process.env.ComSpec || 'cmd.exe') : 'supabase';
  const commandArgs = useWindowsShim ? ['/d', '/s', '/c', ['supabase', ...args].join(' ')] : args;
  const r = spawnSync(executable, commandArgs, {
    cwd: INTEGRATION_ROOT, encoding: 'utf8', shell: false, env: process.env,
  });
  const output = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  if (output) process.stdout.write(output);
  if (r.error) throw r.error;
  return { status: r.status ?? r.signal, output };
}

async function connect() {
  const c = new Client({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 5000,
    statement_timeout: 30000,
  });
  await c.connect();
  return c;
}

async function insertActorGraph(c, label) {
  const accountId = crypto.randomUUID();
  const personId = crypto.randomUUID();
  const householdId = crypto.randomUUID();
  const memberId = crypto.randomUUID();
  const email = `${PREFIX}${label}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.test`;
  await c.query(
    `insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
     values ($1, 'authenticated', 'authenticated', $2, '', now(),
       '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now())`,
    [accountId, email],
  );
  await c.query(
    `insert into public.people (id, auth_user_id, display_name, default_language, personal_settings)
     values ($1, $2, $3, 'es-419', '{}'::jsonb)`,
    [personId, accountId, `${PREFIX}${label}`],
  );
  await c.query(
    `insert into public.households (id, name, slug, timezone, default_language, config, created_by_person_id)
     values ($1, $2, $3, 'America/Argentina/Buenos_Aires', 'es-419', '{}'::jsonb, $4)`,
    [householdId, `${PREFIX}${label}`, `${PREFIX}${label}_${householdId}`, personId],
  );
  await c.query(
    `insert into public.household_members (id, household_id, person_id, role, status, joined_at,
       household_onboarding_status, household_onboarding_completed_at)
     values ($1, $2, $3, 'coordinator', 'active', now(), 'completed', now())`,
    [memberId, householdId, personId],
  );
  await c.query(`update public.people set active_household_id = $1 where id = $2`, [householdId, personId]);
  return { accountId, personId, householdId, memberId };
}

async function countTotal(c) {
  const { rows } = await c.query(
    `select count(*)::int as total
     from public.planner_idempotency_keys
     where idempotency_key like $1`,
    [`${PREFIX}%`],
  );
  return rows[0];
}

async function countLegacyState(c) {
  // Post-backfill only (after migration 20260722090000 has added key_state)
  const { rows } = await c.query(
    `select
       count(*)::int as total,
       count(*) filter (where key_state = 'completed')::int as completed,
       count(*) filter (where key_state = 'failed_stable')::int as failed_stable,
       count(*) filter (where key_state = 'abandoned')::int as abandoned,
       count(*) filter (where key_state = 'in_flight')::int as in_flight,
       count(*) filter (where actor_person_id is not null and actor_account_id is not null)::int as actor_backfilled,
       count(*) filter (where scope_type = 'household' and scope_id = household_id)::int as household_scope
     from public.planner_idempotency_keys
     where idempotency_key like $1`,
    [`${PREFIX}%`],
  );
  return rows[0];
}

async function main() {
  // Phase 1: reset to the migration just before 20260722090000 (which is
  // 20260722010000_m11_1a_task_fulfillment_foundation.sql). Verify target NOT applied.
  console.log('=== F06 Phase 1: reset before 20260722090000 ===');
  const r1 = supa(['db', 'reset', '--local', '--no-seed', '--yes', '--version', TARGET_BEFORE]);
  check(r1.status === 0, 'F06 db reset to 20260722010000 succeeds', { status: r1.status });

  // Confirm target migration NOT applied yet
  const c = await connect();
  try {
    const notApplied = (await c.query(
      `select count(*)::int from supabase_migrations.schema_migrations where version = '20260722090000'`,
    )).rows[0].count;
    check(notApplied === 0, 'F06 20260722090000 not yet applied (pre-backfill state)', { notApplied });

    // Phase 2: seed legacy rows with various response_status values.
    console.log('\n=== F06 Phase 2: seed legacy rows ===');
    const actor = await insertActorGraph(c, 'legacy');
    const vectors = [
      { label: 'ok_200', status: 200, body: { ok: true, id: 'el-200' }, expiry: '1 hour' },
      { label: 'ok_201', status: 201, body: { id: 'el-201' }, expiry: '1 hour' },
      { label: 'bad_400', status: 400, body: { error: 'validation' }, expiry: '1 hour' },
      { label: 'conflict_409', status: 409, body: { error: 'conflict' }, expiry: '1 hour' },
      { label: 'precondition_412', status: 412, body: { error: 'version_conflict_v2' }, expiry: '1 hour' },
      { label: 'unprocessable_422', status: 422, body: { error: 'unprocessable' }, expiry: '1 hour' },
      { label: 'rate_limit_429', status: 429, body: { error: 'rate_limited' }, expiry: '1 hour' },
      { label: 'server_500', status: 500, body: { error: 'internal' }, expiry: '1 hour' },
      { label: 'bad_gw_502', status: 502, body: { error: 'bad_gateway' }, expiry: '1 hour' },
      { label: 'unavail_503', status: 503, body: { error: 'unavailable' }, expiry: '1 hour' },
      { label: 'null_status', status: 0, body: { __inflight: true }, expiry: '-2 hours' },
      { label: 'expired_inflight', status: 0, body: { __inflight: true }, expiry: '-2 hours' },
    ];
    for (const v of vectors) {
      await c.query(
        `insert into public.planner_idempotency_keys (
           household_id, actor_member_id, idempotency_key, operation,
           request_hash, response_status, response_body, expires_at
         ) values (
           $1, $2, $3, $4,
           $5, $6, $7::jsonb, now() + ($8::text)::interval
         )`,
        [
          actor.householdId, actor.memberId,
          `${PREFIX}${v.label}`, `${PREFIX}legacy_op`,
          crypto.createHash('sha256').update(`${PREFIX}${v.label}`).digest('hex'),
          v.status, JSON.stringify(v.body), v.expiry,
        ],
      );
    }
    const seeded = await countTotal(c);
    check(seeded.total === 12, 'F06 seeded 12 legacy rows (all in_flight pre-backfill)', seeded);

    // Phase 3: apply 20260722090000 (pending up).
    console.log('\n=== F06 Phase 3: apply migration (backfill) ===');
    const r3 = supa(['migration', 'up', '--local', '--include-all']);
    check(r3.status === 0, 'F06 migration up succeeds', { status: r3.status });
    const appliedNow = (await c.query(
      `select count(*)::int from supabase_migrations.schema_migrations where version = '20260722090000'`,
    )).rows[0].count;
    check(appliedNow === 1, 'F06 20260722090000 applied exactly once post-backfill', { appliedNow });

    // Phase 4: verify backfill classification.
    console.log('\n=== F06 Phase 4: verify backfill classification ===');
    const rows = (await c.query(
      `select idempotency_key, response_status, key_state, scope_type,
              scope_id = household_id as scope_matches_household,
              actor_person_id is not null as has_actor_person,
              actor_account_id is not null as has_actor_account
       from public.planner_idempotency_keys
       where idempotency_key like $1
       order by idempotency_key`,
      [`${PREFIX}%`],
    )).rows;
    console.log(JSON.stringify(rows, null, 2));

    // Classify by expected contract:
    //   2xx (200, 201) -> completed
    //   allowlisted deterministic 4xx (400, 409, 412, 422, 429) -> failed_stable
    //   5xx (500, 502, 503) -> abandoned
    //   null_status / expired in-flight -> abandoned (status=0 + expired)
    const expected = {
      ok_200: 'completed',
      ok_201: 'completed',
      bad_400: 'failed_stable',     // allowlisted deterministic 4xx per contract
      conflict_409: 'failed_stable',
      precondition_412: 'failed_stable',
      unprocessable_422: 'failed_stable',
      rate_limit_429: 'failed_stable',
      server_500: 'abandoned',
      bad_gw_502: 'abandoned',
      unavail_503: 'abandoned',
      null_status: 'abandoned',
      expired_inflight: 'abandoned',
    };
    let mismatches = 0;
    for (const r of rows) {
      const label = r.idempotency_key.replace(PREFIX, '');
      const want = expected[label];
      check(r.key_state === want, `F06 ${label} expected ${want}`,
        { label, got: r.key_state, want });
      if (r.key_state !== want) mismatches++;
    }
    check(rows.filter((r) => r.has_actor_person && r.has_actor_account).length === 12,
      'F06 actor/account populated for all 12 backfilled rows',
      rows.filter((r) => !(r.has_actor_person && r.has_actor_account)));
    check(rows.filter((r) => r.scope_type === 'household' && r.scope_matches_household).length === 12,
      'F06 household scope populated for all 12 backfilled rows',
      rows.filter((r) => !(r.scope_type === 'household' && r.scope_matches_household)));

    const counts = await countLegacyState(c);
    console.log(JSON.stringify(counts, null, 2));
    check(counts.total === 12, 'F06 total = 12', counts);
    check(counts.completed === 2, 'F06 completed = 2 (200, 201)', counts);
    check(counts.failed_stable === 5, 'F06 failed_stable = 5 (400,409,412,422,429)', counts);
    check(counts.abandoned === 5, 'F06 abandoned = 5 (500,502,503,null,expired)', counts);

    // Phase 5: confirm 5xx is NOT replay-stable.
    console.log('\n=== F06 Phase 5: 5xx replay classification ===');
    // After backfill, a 500 row is abandoned. A retry (reserve) must reclaim it
    // via the abandoned/reclaimed branch, NOT replay as failed_stable.
    const recheck500 = rows.find((r) => r.idempotency_key.endsWith('server_500'));
    check(recheck500.key_state === 'abandoned', 'F06 500 -> abandoned (not failed_stable/replay)', recheck500);
    const recheck503 = rows.find((r) => r.idempotency_key.endsWith('unavail_503'));
    check(recheck503.key_state === 'abandoned', 'F06 503 -> abandoned (not replay)', recheck503);
    // 2xx rows ARE replay stable (completed).
    const recOK200 = rows.find((r) => r.idempotency_key.endsWith('ok_200'));
    check(recOK200.key_state === 'completed', 'F06 200 -> completed (replay-stable)', recOK200);

    // Done — return mismatch count for caller to inspect.
    console.log(JSON.stringify({ mismatches }, null, 2));
    if (mismatches > 0) throw new Error(`F06 had ${mismatches} classification mismatches`);
  } finally { await c.end(); }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
});
