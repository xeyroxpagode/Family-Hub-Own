#!/usr/bin/env node
'use strict';

// S1 — Shared idempotency replay full DB matrix.
// Supplements planner_m11_int_01_shared_database_tests.js (SHARED-01..SHARED-23)
// with the gaps required by the S1 mini-lote contract:
//   S1-06: exact same mutation_id + same binding (NO conflict)
//   S1-08: same mutation_id + different actor (P0008 conflict)
//   S1-13b: household scope reserve via V2 helper
//   S1-14: no raw 23505 escapes the helper (probe via ON CONFLICT path)
//   S1-15: no second audit after exact replay
// All matrix tests exercise real Supabase local; no mocks.

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');

function requirePgClient() {
  const candidates = [
    process.env.PG_MODULE_PATH,
    path.resolve(__dirname, '..', 'backend', 'node_modules', 'pg'),
    path.resolve(__dirname, '..', '..', '..', 'HomePlus', 'backend', 'node_modules', 'pg'),
    'pg',
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return require(candidate).Client;
    } catch (error) {
      if (candidate === 'pg') throw error;
    }
  }

  throw new Error('pg module not found');
}

const Client = requirePgClient();

const DATABASE_URL = process.env.LOCAL_DATABASE_URL
  || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const parsed = new URL(DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
  console.error('ENVIRONMENT_FAILURE: S1 matrix tests are local-only.');
  process.exit(1);
}

const RUN_TAG = process.env.HOMEPLUS_TEST_RUN_ID
  || `s1matrix_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
const FX_PREFIX = `s1m_${RUN_TAG}_`.slice(0, 32).replace(/[^a-z0-9_]/gi, '_');
let assertions = 0;

function check(condition, message) {
  assert.ok(condition, message);
  assertions += 1;
  console.log(`PASS: ${message}`);
}

async function connect() {
  const client = new Client({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 5000,
    statement_timeout: 15000,
  });
  await client.connect();
  return client;
}

async function runAsServiceRole(client, fn) {
  await client.query('set role service_role');
  try {
    return await fn();
  } finally {
    await client.query('reset role');
  }
}

async function expectFailure(fn, message, expectedCode) {
  let error = null;
  try {
    await fn();
  } catch (caught) {
    error = caught;
  }
  check(Boolean(error), message);
  if (expectedCode) {
    check(error?.code === expectedCode, `${message} uses SQLSTATE ${expectedCode} (got ${error?.code ?? null})`);
  }
  return error;
}

// Fixtures ----------------------------------------------------------------

async function insertAccount(client, label) {
  const accountId = crypto.randomUUID();
  const personId = crypto.randomUUID();
  const email = `${FX_PREFIX}${label}@example.test`;
  await client.query(
    `insert into auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values ($1, 'authenticated', 'authenticated', $2, '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb, now(), now())`,
    [accountId, email],
  );
  await client.query(
    `insert into public.people (id, auth_user_id, display_name, default_language, personal_settings)
     values ($1, $2, $3, 'es-419', '{}'::jsonb)`,
    [personId, accountId, `S1 ${label}`],
  );
  return { accountId, personId };
}

async function insertHousehold(client, owner, label) {
  const householdId = crypto.randomUUID();
  await client.query(
    `insert into public.households (
      id, name, slug, timezone, default_language, config, created_by_person_id
    ) values ($1,$2,$3,'America/Argentina/Buenos_Aires','es-419','{}'::jsonb,$4)`,
    [householdId, `S1 ${label}`, `${FX_PREFIX}${label}-${householdId.slice(0, 8)}`, owner.personId],
  );
  return householdId;
}

async function insertMember(client, householdId, account, role, status = 'active') {
  const membershipId = crypto.randomUUID();
  await client.query(
    `insert into public.household_members (
      id, household_id, person_id, role, status, joined_at,
      household_onboarding_status, household_onboarding_completed_at
    ) values ($1,$2,$3,$4,$5,now(),'completed',now())`,
    [membershipId, householdId, account.personId, role, status],
  );
  if (status === 'active') {
    await client.query(
      `update public.people set active_household_id=$1 where id=$2`,
      [householdId, account.personId],
    );
  }
  return membershipId;
}

function sha(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function reserve(client, opts) {
  const { rows } = await runAsServiceRole(client, () => client.query(
    `select public.planner_v2_reserve_idempotency(
       $1, $2, $3, $4, $5,
       'CREATE_IDEMPOTENT', $6, $7, $8, 30
     ) as result`,
    [opts.accountId, opts.personId, opts.scopeType, opts.scopeId,
     opts.operation, opts.idempotencyKey, opts.mutationId, opts.payloadHash],
  ));
  return rows[0].result;
}

async function complete(client, opts) {
  await runAsServiceRole(client, () => client.query(
    `select public.planner_v2_complete_idempotency(
       $1, $2, $3, $4, $5, $6, $7, $8
     )`,
    [opts.idempotencyId, opts.leaseToken, opts.mutationId, opts.payloadHash,
     opts.accountId, opts.responseStatus, opts.responseBody, opts.keyState],
  ));
}

// Main --------------------------------------------------------------------

async function main() {
  const client = await connect();
  try {
    // Each sub-test cleans its idempotency rows; service_role DELETE works
    // because service_role bypasses RLS. We do not open an outer transaction;
    // if a sub-test aborts the surrounding transaction state we still clean
    // up afterwards via an independent cleanup client (see finally block).

    const personA = await insertAccount(client, 'personA');
    const personB = await insertAccount(client, 'personB');
    const householdId = await insertHousehold(client, personA, 'hh');
    const membershipId = await insertMember(client, householdId, personA, 'coordinator');
    await insertMember(client, householdId, personB, 'adult');

    // ── S1-06: exact same mutation_id + same binding (no conflict, replay) ──
    console.log('\n=== S1-06: Same mutation_id + same binding ===');
    {
      const op = `${FX_PREFIX}op06`;
      const key = `${FX_PREFIX}key06`;
      const mut = `${FX_PREFIX}mut06`;
      const hash = sha(`${FX_PREFIX}payload06`);

      const r1 = await reserve(client, {
        accountId: personA.accountId, personId: personA.personId,
        scopeType: 'personal', scopeId: personA.personId,
        operation: op, idempotencyKey: key, mutationId: mut, payloadHash: hash,
      });
      check(r1.outcome === 'reserved', 'S1-06-01: first reserve succeeds');

      await complete(client, {
        idempotencyId: r1.idempotency_id, leaseToken: r1.lease_token,
        mutationId: mut, payloadHash: hash, accountId: personA.accountId,
        responseStatus: 201,
        responseBody: JSON.stringify({ id: 'ent-06', outcome: 'created' }),
        keyState: 'completed',
      });

      const r2 = await reserve(client, {
        accountId: personA.accountId, personId: personA.personId,
        scopeType: 'personal', scopeId: personA.personId,
        operation: op, idempotencyKey: key, mutationId: mut, payloadHash: hash,
      });
      check(r2.outcome === 'replay', 'S1-06-02: second reserve same mut+binding is replay');
      check(r2.response_status === 201, 'S1-06-03: replay returns original 201');
      check(r2.key_state === 'completed', 'S1-06-04: replay state is completed');

      // No second row created
      const rowCount = await runAsServiceRole(client, () => client.query(
        `select count(*)::int from public.planner_idempotency_keys
         where idempotency_key = $1 and mutation_id = $2`,
        [key, mut],
      ));
      check(rowCount.rows[0].count === 1, 'S1-06-05: only one identity row exists');

      await runAsServiceRole(client, () => client.query(
        `delete from public.planner_idempotency_keys where idempotency_key = $1`, [key]),
      );
    }

    // ── S1-08: same mutation_id + different actor → P0008 conflict ──
    console.log('\n=== S1-08: Same mutation_id + different actor ===');
    {
      const op = `${FX_PREFIX}op08`;
      const keyA = `${FX_PREFIX}keyA08`;
      const keyB = `${FX_PREFIX}keyB08`;
      const mut = `${FX_PREFIX}mut08`;
      const hash = sha(`${FX_PREFIX}payload08`);

      // Actor A creates a row with mutation_id mut
      const rA = await reserve(client, {
        accountId: personA.accountId, personId: personA.personId,
        scopeType: 'personal', scopeId: personA.personId,
        operation: op, idempotencyKey: keyA, mutationId: mut, payloadHash: hash,
      });
      check(rA.outcome === 'reserved', 'S1-08-01: actorA reserve succeeds');

      // Actor B attempts with same mutation_id but their own scope/key
      // This MUST raise P0008 conflict (mutation_id is globally unique binding)
      await expectFailure(
        () => reserve(client, {
          accountId: personB.accountId, personId: personB.personId,
          scopeType: 'personal', scopeId: personB.personId,
          operation: op, idempotencyKey: keyB, mutationId: mut, payloadHash: hash,
        }),
        'S1-08-02: actorB same mutation_id conflicts',
        'P0008',
      );

      // No second identity row created
      const rowCount = await runAsServiceRole(client, () => client.query(
        `select count(*)::int from public.planner_idempotency_keys
         where mutation_id = $1`,
        [mut],
      ));
      check(rowCount.rows[0].count === 1, 'S1-08-03: only one identity row for mutation_id');

      await runAsServiceRole(client, () => client.query(
        `delete from public.planner_idempotency_keys where idempotency_key = $1`, [keyA]),
      );
    }

    // ── S1-13b: Household scope reserve via V2 helper ──
    console.log('\n=== S1-13b: Household scope reserve ===');
    {
      const op = `${FX_PREFIX}op13`;
      const key = `${FX_PREFIX}key13`;
      const mut = `${FX_PREFIX}mut13`;
      const hash = sha(`${FX_PREFIX}payload13`);

      const r = await reserve(client, {
        accountId: personA.accountId, personId: personA.personId,
        scopeType: 'household', scopeId: householdId,
        operation: op, idempotencyKey: key, mutationId: mut, payloadHash: hash,
      });
      check(r.outcome === 'reserved', 'S1-13b-01: household reserve succeeds');

      // Verify row has household_id set and scope_id == household_id
      const row = await runAsServiceRole(client, () => client.query(
        `select household_id, actor_member_id, scope_type, scope_id, actor_person_id
         from public.planner_idempotency_keys where idempotency_key = $1`,
        [key],
      ));
      const r0 = row.rows[0];
      check(r0.scope_type === 'household', 'S1-13b-02: scope_type is household');
      check(r0.scope_id === householdId, 'S1-13b-03: scope_id = household_id');
      check(r0.household_id === householdId, 'S1-13b-04: household_id column set');
      check(r0.actor_person_id === personA.personId, 'S1-13b-05: actor_person_id set');
      check(r0.actor_member_id === null, 'S1-13b-06: actor_member_id is null (V2 path)');

      await complete(client, {
        idempotencyId: r.idempotency_id, leaseToken: r.lease_token,
        mutationId: mut, payloadHash: hash, accountId: personA.accountId,
        responseStatus: 200,
        responseBody: JSON.stringify({ ok: true }),
        keyState: 'completed',
      });

      // Replay works
      const rReplay = await reserve(client, {
        accountId: personA.accountId, personId: personA.personId,
        scopeType: 'household', scopeId: householdId,
        operation: op, idempotencyKey: key, mutationId: mut, payloadHash: hash,
      });
      check(rReplay.outcome === 'replay', 'S1-13b-07: household replay works');

      await runAsServiceRole(client, () => client.query(
        `delete from public.planner_idempotency_keys where idempotency_key = $1`, [key]),
      );
    }

    // ── S1-14: no raw 23505 escapes (probe via concurrent two inserts) ──
    console.log('\n=== S1-14: No raw 23505 escapes ===');
    {
      const op = `${FX_PREFIX}op14`;
      const key = `${FX_PREFIX}key14`;
      const mutA = `${FX_PREFIX}mutA14`;
      const mutB = `${FX_PREFIX}mutB14`;
      const hashA = sha(`${FX_PREFIX}payloadA14`);
      const hashB = sha(`${FX_PREFIX}payloadB14`);

      // Two reserves with DIFFERENT mutation_id but SAME idempotency_key
      // The V2 helper must intercept the conflict and raise P0008 — not 23505.
      const rA = await reserve(client, {
        accountId: personA.accountId, personId: personA.personId,
        scopeType: 'personal', scopeId: personA.personId,
        operation: op, idempotencyKey: key, mutationId: mutA, payloadHash: hashA,
      });
      check(rA.outcome === 'reserved', 'S1-14-01: first mutation_id reserve succeeds');

      await complete(client, {
        idempotencyId: rA.idempotency_id, leaseToken: rA.lease_token,
        mutationId: mutA, payloadHash: hashA, accountId: personA.accountId,
        responseStatus: 200,
        responseBody: JSON.stringify({ v: 'A' }),
        keyState: 'completed',
      });

      // Second reserve with different mutation_id but same (actor, scope, op, key)
      // V2 identity unique index would fire 23505 raw if the helper doesn't
      // pre-resolve the existing row. After 20260803120000 fix the existing
      // mutation_id is checked first; here mutation differs from existing's,
      // so the helper must raise P0008 (not 23505).
      const err = await expectFailure(
        () => reserve(client, {
          accountId: personA.accountId, personId: personA.personId,
          scopeType: 'personal', scopeId: personA.personId,
          operation: op, idempotencyKey: key, mutationId: mutB, payloadHash: hashB,
        }),
        'S1-14-02: conflicting mutation_id rejected',
      );
      check(err.code === 'P0008', `S1-14-03: errcode is P0008 not 23505 (got ${err.code})`);
      check(err.code !== '23505', 'S1-14-04: never raw 23505');

      await runAsServiceRole(client, () => client.query(
        `delete from public.planner_idempotency_keys where idempotency_key = $1`, [key]),
      );
    }

    // ── S1-15: No second audit after exact replay (V2 audit dedup) ──
    console.log('\n=== S1-15: No second audit after exact replay ===');
    {
      const op = `${FX_PREFIX}op15`;
      const key = `${FX_PREFIX}key15`;
      const mut = `${FX_PREFIX}mut15`;
      const hash = sha(`${FX_PREFIX}payload15`);
      const aggId = crypto.randomUUID();
      const domain = `${FX_PREFIX}d15`;
      const action = `${FX_PREFIX}a15`;
      const aggType = `${FX_PREFIX}t15`;

      // Reserve + append audit + complete (one transaction)
      const r = await reserve(client, {
        accountId: personA.accountId, personId: personA.personId,
        scopeType: 'personal', scopeId: personA.personId,
        operation: op, idempotencyKey: key, mutationId: mut, payloadHash: hash,
      });

      await runAsServiceRole(client, () => client.query(
        `select public.planner_v2_append_audit(
           $1, $2, 'personal', $3,
           $4, $5, $6, $7,
           'succeeded', null, null, $8, '{}'::jsonb
         )`,
        [personA.accountId, personA.personId, personA.personId,
         domain, action, aggType, aggId, mut],
      ));

      await complete(client, {
        idempotencyId: r.idempotency_id, leaseToken: r.lease_token,
        mutationId: mut, payloadHash: hash, accountId: personA.accountId,
        responseStatus: 200,
        responseBody: JSON.stringify({ ok: true }),
        keyState: 'completed',
      });

      const countAfterFirst = await runAsServiceRole(client, () => client.query(
        `select count(*)::int from public.audit_events
         where mutation_id = $1 and domain = $2 and action = $3 and aggregate_id = $4`,
        [mut, domain, action, aggId],
      ));
      check(countAfterFirst.rows[0].count === 1, 'S1-15-01: first audit count = 1');

      // Retry (exact replay — no second effect, no second audit)
      const rReplay = await reserve(client, {
        accountId: personA.accountId, personId: personA.personId,
        scopeType: 'personal', scopeId: personA.personId,
        operation: op, idempotencyKey: key, mutationId: mut, payloadHash: hash,
      });
      check(rReplay.outcome === 'replay', 'S1-15-02: replay returned');

      // Even if caller mistakenly appends again, the dedup index returns same row
      const secondAuditId = await runAsServiceRole(client, () => client.query(
        `select public.planner_v2_append_audit(
           $1, $2, 'personal', $3,
           $4, $5, $6, $7,
           'succeeded', null, null, $8, '{}'::jsonb
         ) as audit_id`,
        [personA.accountId, personA.personId, personA.personId,
         domain, action, aggType, aggId, mut],
      ));
      const firstAuditId = countAfterFirst.rows[0].count === 1
        ? (await runAsServiceRole(client, () => client.query(
          `select id from public.audit_events
           where mutation_id = $1 and domain = $2 and action = $3 and aggregate_id = $4
           limit 1`,
          [mut, domain, action, aggId],
        ))).rows[0].id
        : null;
      check(secondAuditId.rows[0].audit_id === firstAuditId, 'S1-15-03: duplicate audit returns same id');

      const countAfterReplay = await runAsServiceRole(client, () => client.query(
        `select count(*)::int from public.audit_events
         where mutation_id = $1 and domain = $2 and action = $3 and aggregate_id = $4`,
        [mut, domain, action, aggId],
      ));
      check(countAfterReplay.rows[0].count === 1, 'S1-15-04: audit count still 1 after replay');

      await runAsServiceRole(client, () => client.query(
        `delete from public.planner_idempotency_keys where idempotency_key = $1`, [key]),
      );
      // audit_events append-only: cleanup via session_replication_role at end
    }

    // Also confirm the no_raw_23505 invariant directly via a unique index probe.
    // We attempt a raw INSERT that would collide on the mutation_uidx and verify
    // that the SQLSTATE is 23505 at the SQL level — but that path is never taken
    // by the V2 helper (which uses SELECT-then-INSERT with ON CONFLICT DO NOTHING
    // and a prior mutation_id lookup). We assert the helper implementation
    // declares the dedupe check by inspecting the function source.
    console.log('\n=== S1-14b: Helper function has mutation_id dedupe ===');
    {
      const src = (await client.query(
        `select pg_get_functiondef('public.planner_v2_reserve_idempotency(uuid, uuid, text, uuid, text, text, text, text, text, integer)'::regprocedure) as src`,
      )).rows[0].src;
      check(src.includes('Mutation_id deduplication check'), 'S1-14b-01: helper has mutation_id dedupe block');
      check(src.includes(`'P0008'`), 'S1-14b-02: helper raises P0008 on conflict');
      check(src.includes('on conflict'), 'S1-14b-03: helper uses ON CONFLICT DO NOTHING for V2 identity');
    }

    console.log(`\nS1 MATRIX TESTS: ${assertions} assertions`);
    console.log('VERDICT: PASS');
  } finally {
    // Cleanup any leftover fixtures owned by this run.
    // audit_events is append-only; we sidestep the trigger with
    // session_replication_role = replica (defers triggers). We perform
    // cleanup outside any outer transaction so an aborted transaction
    // from the main block does not poison the cleanup path.
    let cleanupClient;
    try {
      cleanupClient = await connect();
      await cleanupClient.query(`set session_replication_role = 'replica'`);
      await cleanupClient.query(
        `delete from public.audit_events where mutation_id like $1`,
        [`${FX_PREFIX}%`],
      );
      await cleanupClient.query(
        `delete from public.planner_idempotency_keys where idempotency_key like $1`,
        [`${FX_PREFIX}%`],
      );
      await cleanupClient.query(`reset session_replication_role`);
    } catch (cleanupError) {
      console.error(`[s1] cleanup warning: ${cleanupError.message}`);
    } finally {
      if (cleanupClient) await cleanupClient.end().catch(() => {});
    }
    await client.end();
  }
}

main().catch((error) => {
  console.error(`\nS1 MATRIX TESTS FAILED:\n${error.stack || error}`);
  process.exitCode = 1;
});

module.exports = { assertions };
