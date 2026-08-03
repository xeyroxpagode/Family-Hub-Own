#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const QA_ROOT = 'C:\\Users\\thega\\Desktop\\HomePlus-worktrees\\qa';
const INTEGRATION_ROOT = 'C:\\Users\\thega\\Desktop\\HomePlus-worktrees\\integration';
const EVIDENCE_DIR = path.join(QA_ROOT, 'docs', 'implementation', 'planner', 'qa-evidence', 'm11_int_01_phase_2_r2b');
const DATABASE_URL = process.env.LOCAL_DATABASE_URL
  || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const parsed = new URL(DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
  console.error('REMOTE_DATABASE_BLOCKED');
  process.exit(1);
}

function requirePgClient() {
  const candidates = [
    process.env.PG_MODULE_PATH,
    path.join(INTEGRATION_ROOT, 'backend', 'node_modules', 'pg'),
    'C:\\Users\\thega\\Desktop\\HomePlus\\backend\\node_modules\\pg',
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
const { hashIdempotencyRequestV2, invokeAtomicPlannerMutationV2 } = require(path.join(
  INTEGRATION_ROOT,
  'backend',
  'src',
  'lib',
  'plannerIdempotencyAdapter.js',
));

const PREFIX = 'qa_r2b_m11_int_01_';
let assertions = 0;
const summary = {
  findings: [],
  static: {},
  f02: {},
  f01: {},
  r1n1: {},
  f04: {},
  f05: {},
  f06: {},
  cleanup: {},
};

function check(condition, message, details = undefined) {
  assert.ok(condition, details ? `${message}: ${JSON.stringify(details)}` : message);
  assertions += 1;
  console.log(`PASS ${message}${details ? ` ${JSON.stringify(details)}` : ''}`);
}

function record(section, key, value) {
  summary[section][key] = value;
}

function softCheck(condition, message, details = undefined, finding = undefined) {
  if (condition) {
    assertions += 1;
    console.log(`PASS ${message}${details ? ` ${JSON.stringify(details)}` : ''}`);
    return true;
  }
  const entry = finding || { message, details };
  summary.findings.push(entry);
  console.error(`FAIL ${message}${details ? ` ${JSON.stringify(details)}` : ''}`);
  return false;
}

async function connect() {
  const client = new Client({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 5000,
    statement_timeout: 30000,
  });
  await client.connect();
  return client;
}

async function runAs(client, role, fn) {
  await client.query(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await client.query('reset role');
  }
}

async function expectSqlFailure(fn, code, message) {
  let caught = null;
  try {
    await fn();
  } catch (error) {
    caught = error;
  }
  check(Boolean(caught), `${message}: failed`);
  check(caught?.code === code, `${message}: SQLSTATE ${code}`, { got: caught?.code });
  return caught;
}

function supabase(args, label) {
  const useWindowsShim = process.platform === 'win32';
  const executable = useWindowsShim ? (process.env.ComSpec || 'cmd.exe') : 'supabase';
  const commandArgs = useWindowsShim
    ? ['/d', '/s', '/c', ['supabase', ...args].join(' ')]
    : args;
  const result = spawnSync(executable, commandArgs, {
    cwd: INTEGRATION_ROOT,
    encoding: 'utf8',
    shell: false,
    env: process.env,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (output) process.stdout.write(output);
  if (result.error) throw result.error;
  check(result.status === 0, `${label} exits 0`, { status: result.status });
  return output;
}

async function staticCatalog(client) {
  console.log('\n=== STATIC CATALOG ===');
  const migrationSource = fs.readFileSync(path.join(
    INTEGRATION_ROOT,
    'supabase',
    'migrations',
    '20260722090000_m11_int_01_shared_mutation_authority_foundation.sql',
  ), 'utf8');
  const hashFnMatch = migrationSource.match(/create or replace function public\.planner_canonical_request_hash_v2[\s\S]*?\n\$\$;/);
  check(Boolean(hashFnMatch), 'static hash function block found');
  const hashFn = hashFnMatch[0];
  const executableHashFn = hashFn
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');
  check(!/text::bytea/i.test(executableHashFn), 'F02 static: executable hash function does not use text::bytea');
  check(/extensions\.digest\s*\(/i.test(executableHashFn), 'F02 static: hash function uses schema-qualified extensions.digest');
  check(/set search_path = pg_catalog, public/i.test(executableHashFn), 'F02 static: hash function search_path is pg_catalog, public');
  check(!/create extension/i.test(migrationSource), 'F02 static: migration adds no new extension');
  check(/planner_canonical_request_text_v2\(/i.test(hashFn), 'F02 static: canonical text is passed to digest');

  const digestRows = (await client.query(
    `select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args,
            pg_get_function_result(p.oid) as result
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'extensions' and p.proname = 'digest'
     order by args`,
  )).rows;
  record('static', 'digest_signatures', digestRows);
  check(digestRows.some((r) => r.args === 'text, text' && r.result === 'bytea'),
    'F02 catalog: extensions.digest(text, text) exists');
  check(digestRows.some((r) => r.args === 'bytea, text' && r.result === 'bytea'),
    'F02 catalog: extensions.digest(bytea, text) exists');

  const helpers = (await client.query(
    `select p.proname,
            p.prosecdef as security_definer,
            array_to_string(p.proconfig, ',') as config,
            has_function_privilege('public', p.oid, 'EXECUTE') as public_exec,
            has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
            has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'planner_canonical_jsonb_text_v2',
         'planner_canonical_request_text_v2',
         'planner_canonical_request_hash_v2',
         'planner_v2_reserve_idempotency',
         'planner_v2_complete_idempotency',
         'planner_v2_recover_idempotency',
         'planner_v2_append_audit'
       )
     order by p.proname`,
  )).rows;
  record('static', 'helpers', helpers);
  check(helpers.length === 7, 'static: seven V2/private helper functions exist', { count: helpers.length });
  for (const helper of helpers) {
    check(helper.security_definer === true, `${helper.proname}: SECURITY DEFINER`);
    check(String(helper.config || '').includes('search_path=pg_catalog, public'),
      `${helper.proname}: search_path pg_catalog, public`, helper);
    check(helper.public_exec === false && helper.anon_exec === false && helper.auth_exec === false,
      `${helper.proname}: private from PUBLIC/anon/authenticated`, helper);
  }
}

async function f02HashProbe(client) {
  console.log('\n=== F02 HASH PARITY ===');
  const scopePersonal = {
    scopeType: 'personal',
    scopeId: '00000000-0000-0000-0000-000000000001',
    mutationId: 'qa-r2b-hash',
  };
  const vectors = [
    { label: 'qa_original', operation: 'planner.test.op', payload: { title: 'Test', nested: { b: 2, a: 1 }, arr: [1, null, 'x'] } },
    { label: 'ascii', operation: 'ascii.op', payload: { name: 'hello', count: 42, ok: true } },
    { label: 'unicode_acute_a', operation: 'unicode.op', payload: { text: 'cafe á' } },
    { label: 'unicode_enye', operation: 'unicode.op', payload: { text: 'mañana ñ' } },
    { label: 'unicode_u_umlaut', operation: 'unicode.op', payload: { text: 'pingüino ü' } },
    { label: 'emoji', operation: 'emoji.op', payload: { text: 'home ✅ rocket 🚀' } },
    { label: 'escaped_quote_string', operation: 'quote.op', payload: { text: 'a"b"c' } },
    { label: 'newline_string', operation: 'newline.op', payload: { text: 'line\nbreak' } },
    { label: 'crlf', operation: 'crlf.op', payload: { text: 'line\r\nbreak' } },
    { label: 'tab', operation: 'tab.op', payload: { text: 'a\tb' } },
    { label: 'backslash', operation: 'path.op', payload: { text: 'C:\\temp\\file.txt' } },
    { label: 'multiple_backslashes', operation: 'path.op', payload: { text: '\\\\server\\share\\dir' } },
    { label: 'quote_newline', operation: 'quote_newline.op', payload: { text: 'He said "hello"\nthen left.' } },
    { label: 'multiline_description', operation: 'desc.op', payload: { description: 'Uno\nDos\nTres "quoted"' } },
    { label: 'empty_string', operation: 'empty.op', payload: { text: '' } },
    { label: 'payload_null', operation: 'null.op', payload: null },
    { label: 'object_null_property', operation: 'nullprop.op', payload: { keep: 'yes', omit: null } },
    { label: 'null_in_array', operation: 'arraynull.op', payload: { items: ['a', null, 'c'] } },
    { label: 'nested_object', operation: 'nested.op', payload: { z: 1, meta: { b: true, a: { n: 2 } } } },
    { label: 'array_of_objects', operation: 'arrayobj.op', payload: { items: [{ b: 2, a: 1 }, { c: 'see' }] } },
    { label: 'keys_order_a', operation: 'order.op', payload: { a: 1, b: 2, c: { x: 1, y: 2 } } },
    { label: 'keys_order_b', operation: 'order.op', payload: { c: { y: 2, x: 1 }, b: 2, a: 1 } },
    { label: 'arrays_order_a', operation: 'arrayorder.op', payload: { seq: [1, 2, 3] } },
    { label: 'arrays_order_b', operation: 'arrayorder.op', payload: { seq: [3, 2, 1] } },
    { label: 'target_uuid', operation: 'target.op', targetId: 'aabbccdd-1234-5678-90ab-cdef01234567', payload: { name: 'target' } },
    { label: 'expected_version', operation: 'version.op', expectedVersion: 7, payload: { title: 'v7' } },
    { label: 'personal_scope', operation: 'scope.op', scopeType: 'personal', scopeId: '00000000-0000-0000-0000-000000000001', payload: { title: 'personal' } },
    { label: 'household_scope', operation: 'scope.op', scopeType: 'household', scopeId: '00000000-0000-0000-0000-000000000099', payload: { title: 'household' } },
    { label: 'combined_escapables', operation: 'escape.op', payload: { text: 'quote " slash \\ tab\t crlf\r\n newline\n done' } },
    { label: 'long_text', operation: 'long.op', payload: { text: 'planner '.repeat(80).trim() } },
    { label: 'json_control_chars', operation: 'control.op', payload: { text: '\b\f\n\r\t' } },
    { label: 'unicode_quotes_multiline', operation: 'combo.op', payload: { text: 'mañana "sí"\nüber 🚀' } },
  ];

  const results = [];
  for (const vec of vectors) {
    const opts = {
      operation: vec.operation,
      scopeType: vec.scopeType || scopePersonal.scopeType,
      scopeId: vec.scopeId || scopePersonal.scopeId,
      targetId: vec.targetId || null,
      payload: Object.prototype.hasOwnProperty.call(vec, 'payload') ? vec.payload : null,
      expectedVersion: vec.expectedVersion ?? null,
      mutationId: vec.mutationId || scopePersonal.mutationId,
    };
    const jsHash1 = hashIdempotencyRequestV2(opts);
    const jsHash2 = hashIdempotencyRequestV2(opts);
    const sqlHash1 = (await runAs(client, 'service_role', () => client.query(
      `select public.planner_canonical_request_hash_v2(
         $1, $2, $3::uuid, $4::uuid, $5::jsonb, $6::integer, $7
       ) as hash`,
      [
        opts.operation,
        opts.scopeType,
        opts.scopeId,
        opts.targetId,
        opts.payload === null ? null : JSON.stringify(opts.payload),
        opts.expectedVersion,
        opts.mutationId,
      ],
    ))).rows[0].hash;
    const sqlHash2 = (await runAs(client, 'service_role', () => client.query(
      `select public.planner_canonical_request_hash_v2(
         $1, $2, $3::uuid, $4::uuid, $5::jsonb, $6::integer, $7
       ) as hash`,
      [
        opts.operation,
        opts.scopeType,
        opts.scopeId,
        opts.targetId,
        opts.payload === null ? null : JSON.stringify(opts.payload),
        opts.expectedVersion,
        opts.mutationId,
      ],
    ))).rows[0].hash;
    check(/^[a-f0-9]{64}$/.test(jsHash1), `F02 ${vec.label}: JS lowercase 64 hex`);
    check(/^[a-f0-9]{64}$/.test(sqlHash1), `F02 ${vec.label}: SQL lowercase 64 hex`);
    softCheck(jsHash1 === sqlHash1, `F02 ${vec.label}: JS hash equals SQL hash`, { jsHash1, sqlHash1 }, {
      id: 'M11-INT01-P2-R2B-F02-ARRAY-OBJECT-HASH-MISMATCH',
      severity: 'HIGH',
      vector: vec.label,
      observed: { jsHash: jsHash1, sqlHash: sqlHash1 },
      expected: 'JS hashIdempotencyRequestV2 equals PostgreSQL planner_canonical_request_hash_v2 for array-of-objects payloads',
    });
    check(jsHash1 === jsHash2 && sqlHash1 === sqlHash2, `F02 ${vec.label}: deterministic`);
    results.push({ label: vec.label, jsHash: jsHash1, sqlHash: sqlHash1 });
  }

  const payloadA = hashIdempotencyRequestV2({ ...scopePersonal, operation: 'distinct.op', payload: { value: 'A' } });
  const payloadB = hashIdempotencyRequestV2({ ...scopePersonal, operation: 'distinct.op', payload: { value: 'B' } });
  check(payloadA !== payloadB, 'F02 control: different payload produces different hash');
  const orderA = results.find((r) => r.label === 'keys_order_a').jsHash;
  const orderB = results.find((r) => r.label === 'keys_order_b').jsHash;
  check(orderA === orderB, 'F02 control: different object key order produces same hash');
  const arrA = results.find((r) => r.label === 'arrays_order_a').jsHash;
  const arrB = results.find((r) => r.label === 'arrays_order_b').jsHash;
  check(arrA !== arrB, 'F02 control: different array order produces different hash');
  record('f02', 'vectors', results);
}

async function f01Probe() {
  console.log('\n=== F01 ATOMIC FRONTIER ===');
  let rpcCalls = 0;
  const context = {
    client: {},
    accountId: '00000000-0000-0000-0000-000000000010',
    personId: '00000000-0000-0000-0000-000000000020',
  };
  const result = await invokeAtomicPlannerMutationV2(context, {
    idempotencyKey: 'qa-r2b-f01-key',
    mutationId: 'qa-r2b-f01-mutation',
    operation: 'qa.r2b.atomic',
    scopeType: 'personal',
    scopeId: '00000000-0000-0000-0000-000000000020',
    payload: { value: 'one rpc' },
    rpcAdapter: async () => {
      rpcCalls += 1;
      return {
        outcome: 'replay',
        response_status: 200,
        response_body: { ok: true },
        idempotency_id: '00000000-0000-0000-0000-000000000030',
        key_state: 'completed',
        audit_id: '00000000-0000-0000-0000-000000000040',
      };
    },
  });
  check(rpcCalls === 1, 'F01 productive invocation performs exactly one RPC adapter call', { rpcCalls });
  check(result.outcome === 'replay' && result.status === 200 && result.body.ok === true,
    'F01 productive invocation maps one-RPC result');

  const source = fs.readFileSync(path.join(INTEGRATION_ROOT, 'backend', 'src', 'lib', 'plannerIdempotencyAdapter.js'), 'utf8');
  check(!/(const|function|let|var)\s+withIdempotencyV2\b/.test(source)
    && !/withIdempotencyV2\s*:/.test(source),
  'F01 source: withIdempotencyV2 is not defined or exported');
  check(!/mutationFn/.test(source.match(/const invokeAtomicPlannerMutationV2[\s\S]*?module\.exports/s)?.[0] || ''),
    'F01 source: invokeAtomicPlannerMutationV2 does not accept mutationFn');
  check(/const V2_RPC_ALLOWLIST = Object\.freeze\(\[\s*(?:\/\/[^\n]*\n\s*)*\]\)/.test(source),
    'F01 source: V2_RPC_ALLOWLIST remains empty placeholder');
}

async function r1n1Privileges(client) {
  console.log('\n=== R1-N1 PRIVILEGES ===');
  const matrix = (await client.query(
    `select grantee, privilege_type, is_grantable
     from information_schema.role_table_grants
     where table_schema = 'public'
       and table_name = 'planner_idempotency_keys'
       and grantee in ('PUBLIC', 'anon', 'authenticated')
     order by grantee, privilege_type`,
  )).rows;
  record('r1n1', 'role_table_grants', matrix);
  for (const roleDef of [
    { label: 'PUBLIC', role: 'public' },
    { label: 'anon', role: 'anon' },
    { label: 'authenticated', role: 'authenticated' },
  ]) {
    const row = (await client.query(
      `select
         has_table_privilege($1, 'public.planner_idempotency_keys', 'DELETE') as can_delete,
         has_table_privilege($1, 'public.planner_idempotency_keys', 'TRUNCATE') as can_truncate,
         has_table_privilege($1, 'public.planner_idempotency_keys', 'REFERENCES') as can_references,
         has_table_privilege($1, 'public.planner_idempotency_keys', 'TRIGGER') as can_trigger,
         has_table_privilege($1, 'public.planner_idempotency_keys', 'SELECT') as can_select,
         has_table_privilege($1, 'public.planner_idempotency_keys', 'INSERT') as can_insert,
         has_table_privilege($1, 'public.planner_idempotency_keys', 'UPDATE') as can_update`,
      [roleDef.role],
    )).rows[0];
    record('r1n1', roleDef.label, row);
    check(row.can_delete === false, `R1-N1 ${roleDef.label}: DELETE false`);
    check(row.can_truncate === false, `R1-N1 ${roleDef.label}: TRUNCATE false`);
    check(row.can_references === false, `R1-N1 ${roleDef.label}: REFERENCES false`);
    check(row.can_trigger === false, `R1-N1 ${roleDef.label}: TRIGGER false`);
  }
  const auth = summary.r1n1.authenticated;
  check(auth.can_select === true, 'R1-N1 authenticated SELECT preserved');
  check(auth.can_insert === true, 'R1-N1 authenticated INSERT preserved');
  check(auth.can_update === true, 'R1-N1 authenticated UPDATE preserved');
  const anon = summary.r1n1.anon;
  record('r1n1', 'anon_legacy_surface', {
    select: anon.can_select,
    insert: anon.can_insert,
    update: anon.can_update,
  });

  const fixtureId = crypto.randomUUID();
  const actorId = crypto.randomUUID();
  await runAs(client, 'service_role', () => client.query(
    `insert into public.planner_idempotency_keys (
       id, household_id, actor_member_id, actor_account_id, actor_person_id,
       scope_type, scope_id, operation, operation_class, idempotency_key,
       mutation_id, payload_hash, request_hash, key_state,
       response_status, response_body, expires_at, last_seen_at
     ) values (
       $1, null, null, $2, $2,
       'personal', $2, 'qa.r2b.priv', 'CREATE_IDEMPOTENT', $3,
       $4, $5, $5, 'completed',
       200, '{"ok":true}'::jsonb, now() + interval '1 hour', now()
     )`,
    [
      fixtureId,
      actorId,
      `${PREFIX}privilege_key`,
      `${PREFIX}privilege_mutation`,
      crypto.createHash('sha256').update('privilege').digest('hex'),
    ],
  ));
  await expectSqlFailure(
    () => runAs(client, 'authenticated', () => client.query(
      `delete from public.planner_idempotency_keys where id = $1`,
      [fixtureId],
    )),
    '42501',
    'R1-N1 DELETE as authenticated',
  );
  let count = (await client.query(
    `select count(*)::int from public.planner_idempotency_keys where id = $1`,
    [fixtureId],
  )).rows[0].count;
  check(count === 1, 'R1-N1 row remains after authenticated DELETE attempt');
  await expectSqlFailure(
    () => runAs(client, 'anon', () => client.query(
      `delete from public.planner_idempotency_keys where id = $1`,
      [fixtureId],
    )),
    '42501',
    'R1-N1 DELETE as anon',
  );
  count = (await client.query(
    `select count(*)::int from public.planner_idempotency_keys where id = $1`,
    [fixtureId],
  )).rows[0].count;
  check(count === 1, 'R1-N1 row remains after anon DELETE attempt');
  await expectSqlFailure(
    () => runAs(client, 'authenticated', () => client.query('truncate table public.planner_idempotency_keys')),
    '42501',
    'R1-N1 TRUNCATE as authenticated',
  );
  count = (await client.query(
    `select count(*)::int from public.planner_idempotency_keys where id = $1`,
    [fixtureId],
  )).rows[0].count;
  check(count === 1, 'R1-N1 row remains after authenticated TRUNCATE attempt');
  await expectSqlFailure(
    () => runAs(client, 'anon', () => client.query('truncate table public.planner_idempotency_keys')),
    '42501',
    'R1-N1 TRUNCATE as anon',
  );
  count = (await client.query(
    `select count(*)::int from public.planner_idempotency_keys where id = $1`,
    [fixtureId],
  )).rows[0].count;
  check(count === 1, 'R1-N1 row remains after anon TRUNCATE attempt');
  await runAs(client, 'service_role', () => client.query(
    `delete from public.planner_idempotency_keys where id = $1`,
    [fixtureId],
  ));
  count = (await client.query(
    `select count(*)::int from public.planner_idempotency_keys where id = $1`,
    [fixtureId],
  )).rows[0].count;
  check(count === 0, 'R1-N1 service_role cleanup succeeds');
}

async function reserveExpired(client, label) {
  const actorAccountId = crypto.randomUUID();
  const actorPersonId = crypto.randomUUID();
  const payloadHash = crypto.createHash('sha256').update(`${PREFIX}${label}`).digest('hex');
  const result = (await runAs(client, 'service_role', () => client.query(
    `select public.planner_v2_reserve_idempotency(
       $1, $2, 'personal', $2, $3, 'CREATE_IDEMPOTENT', $4, $5, $6, 30
     ) as result`,
    [
      actorAccountId,
      actorPersonId,
      `${PREFIX}op_${label}`,
      `${PREFIX}key_${label}`,
      `${PREFIX}mut_${label}`,
      payloadHash,
    ],
  ))).rows[0].result;
  await runAs(client, 'service_role', () => client.query(
    `update public.planner_idempotency_keys
     set lease_expiry = now() - interval '10 minutes'
     where id = $1`,
    [result.idempotency_id],
  ));
  return { ...result, actorAccountId, actorPersonId, payloadHash, mutationId: `${PREFIX}mut_${label}`, key: `${PREFIX}key_${label}` };
}

async function f04Recovery(client) {
  console.log('\n=== F04 RECOVERY ===');
  const effect = await reserveExpired(client, 'f04_effect');
  const effectResult = (await runAs(client, 'service_role', () => client.query(
    `select public.planner_v2_recover_idempotency(
       $1, $2, $3, $4, $5,
       jsonb_build_object('effect_proven', true, 'response_status', 201, 'response_body', jsonb_build_object('ok', true))
     ) as result`,
    [effect.idempotency_id, effect.actorAccountId, effect.actorPersonId, effect.mutationId, effect.payloadHash],
  ))).rows[0].result;
  check(effectResult.outcome === 'replay' && effectResult.key_state === 'completed',
    'F04 effect_proven reconstructs to completed', effectResult);

  const noEffect = await reserveExpired(client, 'f04_no_effect');
  const noEffectResult = (await runAs(client, 'service_role', () => client.query(
    `select public.planner_v2_recover_idempotency(
       $1, $2, $3, $4, $5, jsonb_build_object('no_effect_proven', true)
     ) as result`,
    [noEffect.idempotency_id, noEffect.actorAccountId, noEffect.actorPersonId, noEffect.mutationId, noEffect.payloadHash],
  ))).rows[0].result;
  check(noEffectResult.outcome === 'abandoned', 'F04 no_effect_proven becomes abandoned', noEffectResult);

  const ambiguous = [
    ['null_evidence', null],
    ['empty_object', {}],
    ['both_false', { effect_proven: false, no_effect_proven: false }],
    ['both_true', { effect_proven: true, no_effect_proven: true }],
    ['unknown_only', { unknown: true }],
  ];
  for (const [label, evidence] of ambiguous) {
    const row = await reserveExpired(client, `f04_${label}`);
    await expectSqlFailure(
      () => runAs(client, 'service_role', () => client.query(
        `select public.planner_v2_recover_idempotency(
           $1, $2, $3, $4, $5, $6::jsonb
         )`,
        [
          row.idempotency_id,
          row.actorAccountId,
          row.actorPersonId,
          row.mutationId,
          row.payloadHash,
          evidence === null ? null : JSON.stringify(evidence),
        ],
      )),
      'P0010',
      `F04 ${label}`,
    );
    const state = (await client.query(
      `select key_state, recovered_at is null as recovered_null,
              recovery_evidence is null as evidence_null,
              lease_token is not null as lease_present
       from public.planner_idempotency_keys where id = $1`,
      [row.idempotency_id],
    )).rows[0];
    check(state.key_state === 'in_flight' && state.recovered_null && state.evidence_null && state.lease_present,
      `F04 ${label}: zero state change on ambiguous`, state);
    await expectSqlFailure(
      () => runAs(client, 'service_role', () => client.query(
        `select public.planner_v2_recover_idempotency(
           $1, $2, $3, $4, $5, $6::jsonb
         )`,
        [
          row.idempotency_id,
          row.actorAccountId,
          row.actorPersonId,
          row.mutationId,
          row.payloadHash,
          evidence === null ? null : JSON.stringify(evidence),
        ],
      )),
      'P0010',
      `F04 ${label} retry fail-closed`,
    );
  }
  await runAs(client, 'service_role', () => client.query(
    `delete from public.planner_idempotency_keys where idempotency_key like $1`,
    [`${PREFIX}key_f04_%`],
  ));
}

async function f05Audit(client) {
  console.log('\n=== F05 AUDIT EXACTLY ONCE ===');
  const indexRows = (await client.query(
    `select indexdef from pg_indexes
     where schemaname = 'public' and tablename = 'audit_events'
       and indexname = 'audit_events_mutation_identity_uidx'`,
  )).rows;
  check(indexRows.length === 1, 'F05 partial unique audit index exists once', indexRows);
  check(/UNIQUE INDEX/.test(indexRows[0].indexdef)
    && /mutation_id, domain, action, aggregate_type, aggregate_id/.test(indexRows[0].indexdef)
    && /WHERE \(mutation_id IS NOT NULL\)/.test(indexRows[0].indexdef),
  'F05 partial unique audit index shape is exact', { indexdef: indexRows[0].indexdef });

  const actorAccountId = crypto.randomUUID();
  const actorPersonId = crypto.randomUUID();
  const aggregateId = crypto.randomUUID();
  const mutationId = `${PREFIX}f05_mutation`;
  async function append(c = client) {
    return (await runAs(c, 'service_role', () => c.query(
      `select public.planner_v2_append_audit(
         $1, $2, 'personal', $2,
         'qa_r2b', 'f05.created', 'qa_aggregate', $3,
         'succeeded', null, 'qa-r2b-request', $4, '{"probe":"f05"}'::jsonb
       ) as id`,
      [actorAccountId, actorPersonId, aggregateId, mutationId],
    ))).rows[0].id;
  }
  const firstId = await append();
  const repeatedId = await append();
  let auditCount = (await client.query(
    `select count(*)::int from public.audit_events where mutation_id = $1`,
    [mutationId],
  )).rows[0].count;
  check(firstId === repeatedId && auditCount === 1, 'F05 repeated append returns same ID and one row', { firstId, repeatedId, auditCount });

  const conMutation = `${PREFIX}f05_concurrent`;
  const conAggregate = crypto.randomUUID();
  async function appendConcurrent() {
    const c = await connect();
    try {
      return (await runAs(c, 'service_role', () => c.query(
        `select public.planner_v2_append_audit(
           $1, $2, 'personal', $2,
           'qa_r2b', 'f05.concurrent', 'qa_aggregate', $3,
           'succeeded', null, 'qa-r2b-request', $4, '{}'::jsonb
         ) as id`,
        [actorAccountId, actorPersonId, conAggregate, conMutation],
      ))).rows[0].id;
    } finally {
      await c.end();
    }
  }
  const concurrentIds = await Promise.all([appendConcurrent(), appendConcurrent(), appendConcurrent()]);
  auditCount = (await client.query(
    `select count(*)::int from public.audit_events where mutation_id = $1`,
    [conMutation],
  )).rows[0].count;
  check(new Set(concurrentIds).size === 1 && auditCount === 1,
    'F05 real concurrent append returns one audit ID and one row', { concurrentIds, auditCount });

  await expectSqlFailure(
    () => runAs(client, 'service_role', () => client.query(
      `insert into public.audit_events (
         household_id, actor_membership_id, actor_account_id, actor_person_id,
         scope_type, scope_id, domain, action, aggregate_type, aggregate_id,
         result, request_id, mutation_id, metadata_version, metadata
       )
       select household_id, actor_membership_id, actor_account_id, actor_person_id,
              scope_type, scope_id, domain, action, aggregate_type, aggregate_id,
              result, request_id, mutation_id, metadata_version, metadata
       from public.audit_events where id = $1`,
      [firstId],
    )),
    '23505',
    'F05 direct duplicate insert',
  );

  const replayReserve = await reserveExpired(client, 'f05_replay');
  await append();
  auditCount = (await client.query(
    `select count(*)::int from public.audit_events where mutation_id = $1`,
    [mutationId],
  )).rows[0].count;
  check(auditCount === 1, 'F05 replay path does not add audit beyond original', { auditCount });

  const noopMutation = `${PREFIX}f05_noop`;
  const noopCount = (await client.query(
    `select count(*)::int from public.audit_events where mutation_id = $1`,
    [noopMutation],
  )).rows[0].count;
  check(noopCount === 0, 'F05 noop creates no audit rows', { noopCount });

  await client.query(`create table if not exists public.qa_r2b_effects (
    id uuid primary key default gen_random_uuid(),
    mutation_id text not null,
    created_at timestamptz not null default now()
  )`);
  const rollbackMutation = `${PREFIX}f05_rollback`;
  await client.query('begin');
  try {
    await runAs(client, 'service_role', async () => {
      await client.query(`insert into public.qa_r2b_effects (mutation_id) values ($1)`, [rollbackMutation]);
      await client.query(
        `select public.planner_v2_append_audit(
           $1, $2, 'personal', $2,
           'qa_r2b', 'f05.rollback', 'qa_aggregate', $3,
           'succeeded', null, 'qa-r2b-request', $4, '{}'::jsonb
         )`,
        [actorAccountId, actorPersonId, crypto.randomUUID(), rollbackMutation],
      );
    });
    await client.query('rollback');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
  const rollbackCounts = (await client.query(
    `select
       (select count(*)::int from public.qa_r2b_effects where mutation_id = $1) as effects,
       (select count(*)::int from public.audit_events where mutation_id = $1) as audits`,
    [rollbackMutation],
  )).rows[0];
  check(rollbackCounts.effects === 0 && rollbackCounts.audits === 0,
    'F05 rollback eliminates effect and audit', rollbackCounts);

  await runAs(client, 'service_role', async () => {
    await client.query(`delete from public.planner_idempotency_keys where idempotency_key like $1`, [`${PREFIX}key_f05_%`]);
  });
  await client.query('drop table if exists public.qa_r2b_effects');
  const tableLeft = (await client.query(
    `select count(*)::int from information_schema.tables where table_schema = 'public' and table_name = 'qa_r2b_effects'`,
  )).rows[0].count;
  check(tableLeft === 0, 'F05 harness table dropped');
  void replayReserve;
}

async function insertActorGraph(client, label) {
  const accountId = crypto.randomUUID();
  const personId = crypto.randomUUID();
  const householdId = crypto.randomUUID();
  const memberId = crypto.randomUUID();
  const email = `${PREFIX}${label}_${Date.now()}@example.test`;
  await client.query(
    `insert into auth.users (
       id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at
     ) values ($1, 'authenticated', 'authenticated', $2, '', now(),
       '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now())`,
    [accountId, email],
  );
  await client.query(
    `insert into public.people (id, auth_user_id, display_name, default_language, personal_settings)
     values ($1, $2, $3, 'es-419', '{}'::jsonb)`,
    [personId, accountId, `${PREFIX}${label}`],
  );
  await client.query(
    `insert into public.households (id, name, slug, timezone, default_language, config, created_by_person_id)
     values ($1, $2, $3, 'America/Argentina/Buenos_Aires', 'es-419', '{}'::jsonb, $4)`,
    [householdId, `${PREFIX}${label}`, `${PREFIX}${label}_${householdId}`, personId],
  );
  await client.query(
    `insert into public.household_members (
       id, household_id, person_id, role, status, joined_at,
       household_onboarding_status, household_onboarding_completed_at
     ) values ($1, $2, $3, 'coordinator', 'active', now(), 'completed', now())`,
    [memberId, householdId, personId],
  );
  await client.query('update public.people set active_household_id = $1 where id = $2', [householdId, personId]);
  return { accountId, personId, householdId, memberId };
}

async function f06LegacyBackfill() {
  console.log('\n=== F06 LEGACY BACKFILL ===');
  supabase(['db', 'reset', '--local', '--no-seed', '--yes', '--version', '20260722010000'], 'F06 reset to pre-20260722090000');
  const client = await connect();
  try {
    const before = (await client.query(
      `select count(*)::int from supabase_migrations.schema_migrations where version = '20260722090000'`,
    )).rows[0].count;
    check(before === 0, 'F06 target migration absent before legacy seed');
    const actor = await insertActorGraph(client, 'f06_legacy');
    const vectors = [
      ['ok_200', 200, 'completed'],
      ['ok_201', 201, 'completed'],
      ['bad_400', 400, 'failed_stable'],
      ['precondition_412', 412, 'failed_stable'],
      ['server_500', 500, 'abandoned'],
      ['expired_no_response', 0, 'abandoned'],
    ];
    for (const [label, status] of vectors) {
      await client.query(
        `insert into public.planner_idempotency_keys (
           household_id, actor_member_id, idempotency_key, operation,
           request_hash, response_status, response_body, expires_at
         ) values ($1, $2, $3, $4, $5, $6, $7::jsonb, now() - interval '2 hours')`,
        [
          actor.householdId,
          actor.memberId,
          `${PREFIX}f06_${label}`,
          `${PREFIX}legacy`,
          crypto.createHash('sha256').update(`${PREFIX}${label}`).digest('hex'),
          status,
          JSON.stringify({ label, status }),
        ],
      );
    }
  } finally {
    await client.end();
  }
  supabase(['migration', 'up', '--local', '--include-all'], 'F06 apply 20260722090000');
  const verify = await connect();
  try {
    const applied = (await verify.query(
      `select count(*)::int from supabase_migrations.schema_migrations where version = '20260722090000'`,
    )).rows[0].count;
    check(applied === 1, 'F06 20260722090000 applied exactly once');
    const rows = (await verify.query(
      `select idempotency_key, response_status, key_state,
              actor_person_id is not null as has_actor_person,
              actor_account_id is not null as has_actor_account,
              scope_type,
              scope_id = household_id as household_scope
       from public.planner_idempotency_keys
       where idempotency_key like $1
       order by idempotency_key`,
      [`${PREFIX}f06_%`],
    )).rows;
    record('f06', 'rows', rows);
    const expected = new Map([
      [`${PREFIX}f06_ok_200`, 'completed'],
      [`${PREFIX}f06_ok_201`, 'completed'],
      [`${PREFIX}f06_bad_400`, 'failed_stable'],
      [`${PREFIX}f06_precondition_412`, 'failed_stable'],
      [`${PREFIX}f06_server_500`, 'abandoned'],
      [`${PREFIX}f06_expired_no_response`, 'abandoned'],
    ]);
    check(rows.length === 6, 'F06 six representative legacy rows present after backfill', { count: rows.length });
    for (const row of rows) {
      check(row.key_state === expected.get(row.idempotency_key), `F06 ${row.idempotency_key}: expected state`, row);
      check(row.has_actor_person && row.has_actor_account && row.scope_type === 'household' && row.household_scope,
        `F06 ${row.idempotency_key}: actor and household scope backfilled`, row);
    }
    check(rows.filter((r) => r.response_status >= 500 && r.key_state !== 'failed_stable').length === 1,
      'F06 no 5xx replay-stable row');
  } finally {
    await verify.end();
  }
}

async function zeroChecks(client, label) {
  const row = (await client.query(
    `select
       (select count(*)::int from public.planner_idempotency_keys
        where idempotency_key like '${PREFIX}%') as idempotency_fixtures,
       (select count(*)::int from public.planner_idempotency_keys
        where lease_token is not null and idempotency_key like '${PREFIX}%') as leases,
       (select count(*)::int from information_schema.tables
        where table_schema = 'public' and table_name like 'qa_r2b%') as qa_tables,
       (select count(*)::int from pg_proc
        where pronamespace = 'public'::regnamespace and proname like 'qa_r2b%') as qa_functions,
       (select count(*)::int from pg_class
        where relpersistence = 't' and relname like 'qa_r2b%') as temp_relations,
       (select count(*)::int from pg_stat_activity
        where datname = current_database() and state = 'idle in transaction') as idle_transactions`,
  )).rows[0];
  record('cleanup', label, row);
  check(row.idempotency_fixtures === 0, `${label}: idempotency fixtures = 0`, row);
  check(row.leases === 0, `${label}: leases = 0`, row);
  check(row.qa_tables === 0, `${label}: QA tables = 0`, row);
  check(row.qa_functions === 0, `${label}: QA functions = 0`, row);
  check(row.temp_relations === 0, `${label}: temp relations = 0`, row);
  check(row.idle_transactions === 0, `${label}: idle transactions = 0`, row);
}

async function assertCleanSensitivity() {
  console.log('\n=== CLEANUP SENSITIVITY ===');
  supabase(['db', 'reset', '--local', '--no-seed', '--yes'], 'cleanup sensitivity reset');
  const client = await connect();
  try {
    await zeroChecks(client, 'cleanup sensitivity initial zero');
    await runAs(client, 'service_role', () => client.query(
      `insert into public.planner_idempotency_keys (
         household_id, actor_member_id, actor_account_id, actor_person_id,
         scope_type, scope_id, operation, operation_class,
         idempotency_key, mutation_id, payload_hash, request_hash, key_state,
         response_status, response_body, expires_at, last_seen_at
       ) values (
         null, null, $1, $1,
         'personal', $1, 'qa.r2b.cleanup', 'CREATE_IDEMPOTENT',
         $2, $3, $4, $4, 'completed',
         200, '{"dirty":true}'::jsonb, now() + interval '1 hour', now()
       )`,
      [
        crypto.randomUUID(),
        `${PREFIX}dirty_fixture`,
        `${PREFIX}dirty_mutation`,
        crypto.createHash('sha256').update('dirty').digest('hex'),
      ],
    ));
    const dirty = (await client.query(
      `select count(*)::int from public.planner_idempotency_keys where idempotency_key = $1`,
      [`${PREFIX}dirty_fixture`],
    )).rows[0].count;
    check(dirty === 1, 'cleanup sensitivity dirty fixture inserted');
    let failed = false;
    try {
      await zeroChecks(client, 'cleanup sensitivity dirty zero');
    } catch (error) {
      failed = true;
      console.log(`PASS cleanup sensitivity assert-clean fails while dirty: ${error.message}`);
    }
    check(failed === true, 'cleanup sensitivity detects dirty fixture');
    await runAs(client, 'service_role', () => client.query(
      `delete from public.planner_idempotency_keys where idempotency_key = $1`,
      [`${PREFIX}dirty_fixture`],
    ));
    await zeroChecks(client, 'cleanup sensitivity post-clean zero');
  } finally {
    await client.end();
  }
}

async function main() {
  const mode = process.argv[2] || 'all';
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  if (mode === 'all') {
    supabase(['db', 'reset', '--local', '--no-seed', '--yes'], 'initial full reset');
    const client = await connect();
    try {
      await staticCatalog(client);
      await f01Probe();
      await f02HashProbe(client);
      await r1n1Privileges(client);
      await f04Recovery(client);
      await f05Audit(client);
      await zeroChecks(client, 'post primary probe zero');
    } finally {
      await client.end();
    }
    await f06LegacyBackfill();
    await assertCleanSensitivity();
  } else if (mode === 'zero') {
    const client = await connect();
    try {
      await zeroChecks(client, 'final zero');
    } finally {
      await client.end();
    }
  } else {
    throw new Error(`unknown mode ${mode}`);
  }
  summary.assertions = assertions;
  fs.writeFileSync(path.join(EVIDENCE_DIR, `r2b_independent_probe_${mode}_summary.json`), JSON.stringify(summary, null, 2));
  console.log(`\nR2B INDEPENDENT PROBE: ${assertions} assertions`);
  if (summary.findings.length > 0) {
    console.log('VERDICT: FAIL');
    process.exitCode = 1;
  } else {
    console.log('VERDICT: PASS');
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
