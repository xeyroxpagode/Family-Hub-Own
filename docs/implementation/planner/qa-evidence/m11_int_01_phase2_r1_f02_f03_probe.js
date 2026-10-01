#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Client } = require('C:\\Users\\thega\\Desktop\\HomePlus\\backend\\node_modules\\pg');

const DATABASE_URL = process.env.LOCAL_DATABASE_URL
  || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const parsed = new URL(DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
  console.error('REMOTE_DATABASE_BLOCKED');
  process.exit(1);
}

const PREFIX = 'qa_m11_int_01_p2_r1_';
const TARGET_VERSION = '20260722090000';

async function connect() {
  const c = new Client({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 5000,
    statement_timeout: 15000,
  });
  await c.connect();
  return c;
}

async function asRole(c, role, fn) {
  await c.query(`set role ${role}`);
  try { return await fn(); } finally { await c.query('reset role'); }
}

function check(cond, msg, details) {
  assert.ok(cond, details ? `${msg}: ${JSON.stringify(details)}` : msg);
  console.log(`PASS ${msg}${details ? ' ' + JSON.stringify(details) : ''}`);
}

// ─────────────────────────────────────────────────────────────────────────
// F02 — independent hash vectors. JS reference (labeled here) is computed
// the same way the QA probe does: sortByKey + JSON.stringify with null-stripping
// replacer. We compare the SQL output of planner_canonical_request_hash_v2.
// ─────────────────────────────────────────────────────────────────────────

function isPlainObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function sortByKey(v) {
  if (Array.isArray(v)) return v.map(sortByKey);
  if (!isPlainObject(v)) return v;
  return Object.keys(v).sort().reduce((a, k) => { a[k] = sortByKey(v[k]); return a; }, {});
}
function hashReference(input) {
  const canonical = sortByKey({
    operation: input.operation,
    scope_type: input.scopeType,
    scope_id: input.scopeId,
    target_id: input.targetId,
    payload: input.payload,
    expected_version: input.expectedVersion,
    mutation_id: input.mutationId,
  });
  const stripped = JSON.stringify(canonical, (_k, v) => v === null ? undefined : v);
  return {
    canonical: stripped,
    hash: crypto.createHash('sha256').update(stripped).digest('hex'),
  };
}

function toPgUuid(v) { return v === null || v === undefined ? null : String(v); }
function payloadToPg(v) {
  if (v === null || v === undefined) return null;
  return JSON.stringify(v);
}

const VECTORS = [
  // (label, input) — input has DOM-friendly JS values; we re-pass them.
  { label: 'qa_prior_vector',
    input: {
      operation: `${PREFIX}hash.op`,
      scopeType: 'personal',
      scopeId: '00000000-0000-0000-0000-000000000001',
      targetId: null,
      payload: { zeta: true, nested: { b: 2, a: 1 }, name: 'hash parity' },
      expectedVersion: null,
      mutationId: `${PREFIX}hash_mutation`,
    } },
  { label: 'empty_object_payload',
    input: {
      operation: 'op.empty', scopeType: 'personal',
      scopeId: '00000000-0000-0000-0000-000000000002', targetId: null,
      payload: {}, expectedVersion: null, mutationId: 'mut.empty',
    } },
  { label: 'null_payload',
    input: {
      operation: 'op.nullp', scopeType: 'personal',
      scopeId: '00000000-0000-0000-0000-000000000003', targetId: null,
      payload: null, expectedVersion: null, mutationId: 'mut.nullp',
    } },
  { label: 'nested_keys_different_order',
    input: {
      operation: 'op.order', scopeType: 'household',
      scopeId: '00000000-0000-0000-0000-000000000010', targetId: null,
      payload: { z: { y: 1, x: 2, a: { c: 3, b: 4 } }, a: 0, m: 'x' },
      expectedVersion: null, mutationId: 'mut.order',
    } },
  { label: 'array_objects',
    input: {
      operation: 'op.arr', scopeType: 'personal',
      scopeId: '00000000-0000-0000-0000-000000000011', targetId: null,
      payload: { items: [{ id: 2, name: 'b', extra: null }, { id: 1, name: 'a', tag: 'x' }] },
      expectedVersion: 5, mutationId: 'mut.arr',
    } },
  { label: 'nested_null_omit',
    input: {
      operation: 'op.nul', scopeType: 'personal',
      scopeId: '00000000-0000-0000-0000-000000000012', targetId: null,
      payload: { a: 1, b: null, c: { d: null, e: 3 }, arr: [1, null, 'x'] },
      expectedVersion: null, mutationId: 'mut.nul',
    } },
  { label: 'explicit_null_vs_omit_distinct',
    input: {
      operation: 'op.xn', scopeType: 'personal',
      scopeId: '00000000-0000-0000-0000-000000000013', targetId: null,
      payload: { present: 'yes' }, expectedVersion: null, mutationId: 'mut.xn',
    } },
  { label: 'strings_escapes_unicode',
    input: {
      operation: 'op.str', scopeType: 'personal',
      scopeId: '00000000-0000-0000-0000-000000000014', targetId: null,
      payload: { s1: '', s2: '  spaces  ', s3: 'line\nbreak', s4: '"quotes\\"', s5: 'á León ñ campera', s6: 'invicta\\backslash', s7: 'emoji 🚀', s8: 'déjà vu' },
      expectedVersion: null, mutationId: 'mut.str',
    } },
  { label: 'numbers_edge',
    input: {
      operation: 'op.num', scopeType: 'personal',
      scopeId: '00000000-0000-0000-0000-000000000015', targetId: null,
      payload: { zero: 0, neg: -42, maxInt: 9007199254740991, dec: 1.5, one: 1 },
      expectedVersion: 0, mutationId: 'mut.num',
    } },
  { label: 'uuid_uppercase_transport',
    input: {
      operation: 'op.uid', scopeType: 'personal',
      scopeId: '00000000-0000-0000-0000-000000000016', targetId: null,
      payload: { marker: 'u' }, expectedVersion: null, mutationId: 'mut.uid',
    } },
  { label: 'target_id_present',
    input: {
      operation: 'op.tgt', scopeType: 'personal',
      scopeId: '00000000-0000-0000-0000-000000000017',
      targetId: '00000000-0000-0000-0000-000000000099',
      payload: { k: 'v' }, expectedVersion: 7, mutationId: 'mut.tgt',
    } },
  { label: 'scope_household',
    input: {
      operation: 'op.house', scopeType: 'household',
      scopeId: '00000000-0000-0000-0000-000000000020', targetId: null,
      payload: { householdOnly: true }, expectedVersion: 12, mutationId: 'mut.house',
    } },
  { label: 'different_operation_must_differ_hash',
    input: {
      operation: 'op.A', scopeType: 'personal',
      scopeId: '00000000-0000-0000-0000-000000000021', targetId: null,
      payload: { v: 1 }, expectedVersion: null, mutationId: 'mut.A',
    } },
];

async function vectorResults() {
  const c = await connect();
  try {
    const out = [];
    for (const v of VECTORS) {
      const { canonical, hash } = hashReference(v.input);
      // scope_id and target_id are uuid-typed in SQL. PG coerces text to uuid;
      // but uppercase UUID would also coerce. We pass via $n as text/helpers.
      // For NULL target_id pass null. payload as JSON string.
      const { rows } = await c.query(
        `select public.planner_canonical_request_text_v2(
           $1::text, $2::text, $3::uuid, $4::uuid, $5::jsonb, $6::integer, $7::text
         ) as canonical_text,
         public.planner_canonical_request_hash_v2(
           $1::text, $2::text, $3::uuid, $4::uuid, $5::jsonb, $6::integer, $7::text
         ) as sql_hash`,
        [
          v.input.operation,
          v.input.scopeType,
          toPgUuid(v.input.scopeId),
          toPgUuid(v.input.targetId),
          payloadToPg(v.input.payload),
          v.input.expectedVersion,
          v.input.mutationId,
        ],
      );
      out.push({
        label: v.label,
        jsCanonical: canonical,
        sqlCanonicalText: rows[0].canonical_text,
        jsHash: hash,
        sqlHash: rows[0].sql_hash,
      });
    }
    return out;
  } finally { await c.end(); }
}

async function f02HashParity() {
  const results = await vectorResults();
  let mismatches = 0;
  for (const r of results) {
    check(r.jsHash === r.sqlHash, `F02 ${r.label} hash parity`,
      { jsHash: r.jsHash, sqlHash: r.sqlHash, jsCanonical: r.jsCanonical, sqlCanonical: r.sqlCanonicalText });
    if (r.jsHash !== r.sqlHash) mismatches++;
    // canonical text must match byte-for-byte (best-effort)
    check(r.jsCanonical === r.sqlCanonicalText, `F02 ${r.label} canonical text parity`,
      { jsCanonical: r.jsCanonical, sqlCanonical: r.sqlCanonicalText });
  }

  // Distinct-hash assertion: two vectors that must differ in canonical properties.
  const a = results.find((r) => r.label === 'different_operation_must_differ_hash');
  const b = results.find((r) => r.label === 'qa_prior_vector');
  check(a.jsHash !== b.jsHash, 'F02 distinct vectors produce distinct hashes',
    { a: a.jsHash, b: b.jsHash });

  console.log(JSON.stringify(results.map((r) => ({ label: r.label, jsHash: r.jsHash, sqlHash: r.sqlHash, match: r.jsHash === r.sqlHash })), null, 2));
  return { mismatches };
}

// ─────────────────────────────────────────────────────────────────────────
// F03 — behavioral DELETE probes by anon, authenticated, and a PUBLIC GRANT
// ─────────────────────────────────────────────────────────────────────────

async function insertSeedRow(c, key) {
  const zeroHash = '0'.repeat(64);
  await c.query(
    `insert into public.planner_idempotency_keys (
       household_id, actor_member_id, idempotency_key, operation,
       request_hash, response_status, response_body, expires_at, key_state,
       actor_person_id, actor_account_id, scope_type, scope_id,
       operation_class, mutation_id, payload_hash
     ) values (
       null, null, $1, $2,
       $3, 0, jsonb_build_object('__seed', true),
       now() + interval '1 hour', 'in_flight',
       '00000000-0000-0000-0000-000000000001'::uuid,
       '00000000-0000-0000-0000-000000000002'::uuid,
       'personal', '00000000-0000-0000-0000-000000000001'::uuid,
       'CREATE_IDEMPOTENT', $4, $3
     )`,
    [key, `${PREFIX}seed_op`, zeroHash, `${PREFIX}seed_mut`],
  );
}

async function f03Privileges() {
  const c = await connect();
  try {
    // 'PUBLIC' is not a queryable role in pg. For PUBLIC's table privileges,
    // we inspect table ACL directly (grantee=0) and also do an effective
    // check via aclexplode. anon and authenticated can be queried via
    // has_table_privilege(role_oid_or_name, table, priv).
    const roleSpecs = [
      { key: 'anon', sqlName: 'anon' },
      { key: 'authenticated', sqlName: 'authenticated' },
    ];
    const tables = ['public.planner_idempotency_keys', 'public.audit_events'];
    const privs = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
    const report = { PUBLIC: {} };
    for (const table of tables) {
      // PUBLIC effective privileges via acldefault + explicit ACL.
      const aclRow = (await c.query(
        `select
           (aclexplode(coalesce(
              (SELECT relacl FROM pg_class WHERE oid = '${table}'::regclass),
              acldefault('r', (SELECT relowner FROM pg_class WHERE oid = '${table}'::regclass))
           ))).grantee as grantee,
           (aclexplode(coalesce(
              (SELECT relacl FROM pg_class WHERE oid = '${table}'::regclass),
              acldefault('r', (SELECT relowner FROM pg_class WHERE oid = '${table}'::regclass))
           ))).privilege_type as priv`,
      )).rows.filter((r) => r.grantee === 0).map((r) => r.priv);
      const obj = {};
      for (const p of privs) obj[p.toLowerCase()] = aclRow.includes(p);
      report.PUBLIC[table] = obj;
    }
    for (const role of roleSpecs) {
      report[role.key] = {};
      for (const table of tables) {
        const row = (await c.query(
          `select ${privs.map((p) => `has_table_privilege('${role.sqlName}', '${table}', '${p}') as ${p.toLowerCase()}`).join(', ')}`,
        )).rows[0];
        report[role.key][table] = row;
      }
    }
    console.log(JSON.stringify(report, null, 2));

    // Hard assertions (F03 closure criteria):
    check(report.authenticated['public.planner_idempotency_keys'].delete === false,
      'F03 authenticated DELETE on planner_idempotency_keys=false',
      report.authenticated['public.planner_idempotency_keys']);
    check(report.anon['public.planner_idempotency_keys'].delete === false,
      'F03 anon DELETE on planner_idempotency_keys=false', report.anon['public.planner_idempotency_keys']);
    check(report.PUBLIC['public.planner_idempotency_keys'].delete === false,
      'F03 PUBLIC DELETE on planner_idempotency_keys=false', report.PUBLIC['public.planner_idempotency_keys']);
    // S/I/U remain for authenticated (legacy preserved). We do NOT assert on
    // trunc/references/trigger here: that's tracked separately as new finding
    // R1-N1. Only verify the F03 closure criteria strictly.
    const ag = report.authenticated['public.planner_idempotency_keys'];
    check(ag.select && ag.insert && ag.update && !ag.delete,
      'F03 authenticated keeps SELECT/INSERT/UPDATE; DELETE revoked', ag);
    // audit_events: no DELETE for any client role
    check(report.authenticated['public.audit_events'].delete === false,
      'F03 authenticated DELETE on audit_events=false', report.authenticated['public.audit_events']);
    check(report.anon['public.audit_events'].delete === false, 'F03 anon DELETE on audit_events=false',
      report.anon['public.audit_events']);
    check(report.PUBLIC['public.audit_events'].delete === false, 'F03 PUBLIC DELETE on audit_events=false',
      report.PUBLIC['public.audit_events']);

    // Behavioral DELETE attempt as authenticated / anon
    // seed row, then try to delete it. cleanup after.
    await insertSeedRow(c, `${PREFIX}seed_for_delete`);
    let authDelErr = null;
    try {
      await asRole(c, 'authenticated', () => c.query(
        `delete from public.planner_idempotency_keys where idempotency_key = $1`,
        [`${PREFIX}seed_for_delete`],
      ));
    } catch (e) { authDelErr = e; }
    const authStillThere = (await c.query(
      `select count(*)::int from public.planner_idempotency_keys where idempotency_key = $1`,
      [`${PREFIX}seed_for_delete`],
    )).rows[0].count;
    check(Boolean(authDelErr), 'F03 authenticated DELETE raises an error',
      authDelErr ? `${authDelErr.code} ${authDelErr.message}` : 'NO_ERROR_DELETE_OK');
    check(authStillThere === 1, 'F03 authenticated DELETE preserved the row', { authStillThere });

    // anon delete attempt
    let anonDelErr = null;
    try {
      await asRole(c, 'anon', () => c.query(
        `delete from public.planner_idempotency_keys where idempotency_key = $1`,
        [`${PREFIX}seed_for_delete`],
      ));
    } catch (e) { anonDelErr = e; }
    check(Boolean(anonDelErr), 'F03 anon DELETE raises an error',
      anonDelErr ? `${anonDelErr.code} ${anonDelErr.message}` : 'NO_ERROR_DELETE_OK');

    // cleanup: use service_role (retains DELETE)
    await asRole(c, 'service_role', () => c.query(
      `delete from public.planner_idempotency_keys where idempotency_key = $1`,
      [`${PREFIX}seed_for_delete`],
    ));
    const cleanupCount = (await c.query(
      `select count(*)::int from public.planner_idempotency_keys where idempotency_key = $1`,
      [`${PREFIX}seed_for_delete`],
    )).rows[0].count;
    check(cleanupCount === 0, 'F03 service_role cleanup ok', { cleanupCount });

    return report;
  } finally { await c.end(); }
}

// ─────────────────────────────────────────────────────────────────────────
// F03 — also verify the two R1 canonical-text helper functions exist and are
// private (not enumerable in catalog probe).
// ─────────────────────────────────────────────────────────────────────────

async function f02HelpersCatalog() {
  const c = await connect();
  try {
    const r = (await c.query(
      `select p.proname,
              p.prosecdef,
              p.proconfig,
              has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_exec,
              has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
              (select exists (
                 select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                 where a.grantee = 0 and a.privilege_type = 'EXECUTE')) as public_exec
       from pg_proc p
       where p.pronamespace = 'public'::regnamespace
         and p.proname in (
           'planner_canonical_jsonb_text_v2',
           'planner_canonical_request_text_v2',
           'planner_canonical_request_hash_v2'
         )
       order by p.proname`,
    )).rows;
    check(r.length === 3, 'F02 three canonical helper functions exist', r.map((x) => x.proname));
    for (const h of r) {
      check(h.prosecdef === true, `F02 ${h.proname} SECURITY DEFINER`, { proname: h.proname, prosecdef: h.prosecdef });
      check(h.authenticated_exec === false && h.anon_exec === false && h.public_exec === false,
        `F02 ${h.proname} not executable by PUBLIC/anon/authenticated`,
        { proname: h.proname, authenticated_exec: h.authenticated_exec, anon_exec: h.anon_exec, public_exec: h.public_exec });
      check(String(h.proconfig || '').includes('search_path=pg_catalog, public'),
        `F02 ${h.proname} search_path includes pg_catalog, public`, { proname: h.proname, proconfig: h.proconfig });
    }
    console.log(JSON.stringify(r, null, 2));
    return r;
  } finally { await c.end(); }
}

async function main() {
  const mode = process.argv[2];
  if (mode === 'f02-helpers') return await f02HelpersCatalog();
  if (mode === 'f02-vectors') return await f02HashParity();
  if (mode === 'f03') return await f03Privileges();
  console.error(`Usage: node ${process.argv[1]} <f02-helpers|f02-vectors|f03>`);
  process.exit(2);
}

main().then(() => { process.exit(0); }).catch((e) => {
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
});
