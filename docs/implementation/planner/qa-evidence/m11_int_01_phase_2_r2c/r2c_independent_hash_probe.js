#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');

const integrationRoot = 'C:\\Users\\thega\\Desktop\\HomePlus-worktrees\\integration';
const adapterPath = path.join(integrationRoot, 'backend', 'src', 'lib', 'plannerIdempotencyAdapter.js');

const {
  hashIdempotencyRequestV2,
  hashIdempotencyRequest,
} = require(adapterPath);

function requirePgClient() {
  const candidates = [
    process.env.PG_MODULE_PATH,
    path.join(integrationRoot, 'backend', 'node_modules', 'pg'),
    path.join(integrationRoot, 'node_modules', 'pg'),
    'C:\\Users\\thega\\Desktop\\HomePlus\\backend\\node_modules\\pg',
    'C:\\Users\\thega\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\pg',
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
  console.error('ENVIRONMENT_FAILURE: local PostgreSQL only');
  process.exit(1);
}

let assertions = 0;
const results = [];

function check(condition, message) {
  assert.ok(condition, message);
  assertions += 1;
  console.log(`PASS: ${message}`);
}

function stableClone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

async function sqlHash(client, opts) {
  const { rows } = await client.query(
    `select public.planner_canonical_request_hash_v2($1, $2, $3, $4, $5, $6, $7) as hash`,
    [
      opts.operation,
      opts.scopeType,
      opts.scopeId,
      opts.targetId ?? null,
      opts.payload === null || opts.payload === undefined ? null : JSON.stringify(opts.payload),
      opts.expectedVersion ?? null,
      opts.mutationId,
    ],
  );
  return rows[0].hash;
}

function makeOpts(vector, payload) {
  return {
    operation: vector.operation,
    scopeType: vector.scopeType || 'personal',
    scopeId: vector.scopeId || '00000000-0000-0000-0000-000000000001',
    targetId: vector.targetId ?? null,
    payload,
    expectedVersion: vector.expectedVersion ?? null,
    mutationId: vector.mutationId || 'r2c-independent-probe',
  };
}

async function assertHashVector(client, vector) {
  const leftBefore = JSON.stringify(vector.left);
  const leftKeysBefore = vector.captureFirstItemKeys
    ? Object.keys(vector.left.items[0]).join(',')
    : null;
  const leftOpts = makeOpts(vector, vector.left);
  const rightOpts = makeOpts(vector, vector.right);
  const jsLeft = hashIdempotencyRequestV2(leftOpts);
  const jsLeftRepeat = hashIdempotencyRequestV2(leftOpts);
  const jsRight = hashIdempotencyRequestV2(rightOpts);
  const sqlLeft = await sqlHash(client, leftOpts);
  const sqlRight = await sqlHash(client, rightOpts);

  results.push({
    label: vector.label,
    jsLeft,
    jsRight,
    sqlLeft,
    sqlRight,
    expectSame: vector.expectSame,
  });

  check(/^[a-f0-9]{64}$/.test(jsLeft), `${vector.label}: JS left is lowercase 64 hex`);
  check(/^[a-f0-9]{64}$/.test(sqlLeft), `${vector.label}: SQL left is lowercase 64 hex`);
  check(jsLeft === jsLeftRepeat, `${vector.label}: JS deterministic`);
  check(jsLeft === sqlLeft, `${vector.label}: JS left equals SQL left`);
  check(jsRight === sqlRight, `${vector.label}: JS right equals SQL right`);
  if (vector.expectSame) {
    check(jsLeft === jsRight, `${vector.label}: JS canonical equivalence holds`);
    check(sqlLeft === sqlRight, `${vector.label}: SQL canonical equivalence holds`);
  } else {
    check(jsLeft !== jsRight, `${vector.label}: JS preserves significant difference`);
    check(sqlLeft !== sqlRight, `${vector.label}: SQL preserves significant difference`);
  }
  check(JSON.stringify(vector.left) === leftBefore, `${vector.label}: payload not mutated`);
  if (leftKeysBefore !== null) {
    check(Object.keys(vector.left.items[0]).join(',') === leftKeysBefore,
      `${vector.label}: original object key order not mutated`);
  }
}

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 5000,
    statement_timeout: 15000,
  });
  await client.connect();
  try {
    check(typeof hashIdempotencyRequestV2 === 'function', 'real Integration hashIdempotencyRequestV2 imported');
    check(typeof hashIdempotencyRequest === 'function', 'real Integration hashIdempotencyRequest imported');

    const vectors = [
      {
        label: 'original_blocker_array_object',
        operation: 'arr.object.qa',
        left: { items: [{ b: 2, a: 1 }, { c: 'see' }] },
        right: { items: [{ a: 1, b: 2 }, { c: 'see' }] },
        expectSame: true,
        mutationId: 'req-array-object',
        captureFirstItemKeys: true,
      },
      {
        label: 'array_order_with_objects',
        operation: 'arr.object.qa',
        left: { items: [{ a: 1, b: 2 }, { c: 'see' }] },
        right: { items: [{ c: 'see' }, { a: 1, b: 2 }] },
        expectSame: false,
        mutationId: 'req-array-object',
      },
      {
        label: 'arrays_inside_arrays_recurse',
        operation: 'arr.arr.objects',
        left: { items: [[{ z: 26, a: 1 }], ['stable', { d: 4, c: 3 }]] },
        right: { items: [[{ a: 1, z: 26 }], ['stable', { c: 3, d: 4 }]] },
        expectSame: true,
      },
      {
        label: 'array_object_with_nested_array_objects',
        operation: 'arr.object.with.array',
        left: { items: [{ tags: [{ z: 26, a: 1 }, { b: 2 }] }] },
        right: { items: [{ tags: [{ a: 1, z: 26 }, { b: 2 }] }] },
        expectSame: true,
      },
      {
        label: 'object_with_array_of_objects',
        operation: 'object.wrapper',
        left: { wrapper: { items: [{ y: 2, x: 1 }, { beta: true, alpha: false }] } },
        right: { wrapper: { items: [{ x: 1, y: 2 }, { alpha: false, beta: true }] } },
        expectSame: true,
      },
      {
        label: 'array_object_nested_object',
        operation: 'arr.nested.object',
        left: { items: [{ meta: { z: 'last', a: 'first' } }] },
        right: { items: [{ meta: { a: 'first', z: 'last' } }] },
        expectSame: true,
      },
      {
        label: 'array_object_nested_array_objects',
        operation: 'arr.nested.array.objects',
        left: { items: [{ children: [{ two: 2, one: 1 }] }] },
        right: { items: [{ children: [{ one: 1, two: 2 }] }] },
        expectSame: true,
      },
      {
        label: 'mixed_primitives_objects_nulls',
        operation: 'arr.mixed',
        left: { items: ['alpha', null, 1, true, { b: 2, a: 1 }] },
        right: { items: ['alpha', null, 1, true, { a: 1, b: 2 }] },
        expectSame: true,
      },
      {
        label: 'quotes_newline_in_array_object',
        operation: 'arr.unicode.complex',
        left: { items: [{ text: 'He said "hello"\nline two', b: 2, a: 1 }] },
        right: { items: [{ a: 1, b: 2, text: 'He said "hello"\nline two' }] },
        expectSame: true,
      },
      {
        label: 'scope_household_target_expected_version',
        operation: 'edit.op',
        scopeType: 'household',
        scopeId: '00000000-0000-0000-0000-000000000010',
        targetId: 'aabbccdd-1234-5678-90ab-cdef01234567',
        expectedVersion: 7,
        mutationId: 'r2c-target-version',
        left: { items: [{ b: 2, a: 1 }] },
        right: { items: [{ a: 1, b: 2 }] },
        expectSame: true,
      },
    ];

    for (const vector of vectors) {
      vector.left = stableClone(vector.left);
      vector.right = stableClone(vector.right);
      await assertHashVector(client, vector);
    }

    const v0Goldens = [
      {
        label: 'body_simple',
        expectedHash: '219b373b2705a94ef693c8d5484e5aa4aba2de5d9aeb03885a9f62056b4778b4',
        input: { method: 'post', operation: 'legacy.simple', params: {}, body: { a: 1 }, expectedVersion: null },
      },
      {
        label: 'nested_object',
        expectedHash: '2b83a162ea0c1d6c4c8f915a04321777e1ce4d99d5da638f9200992e18a350d6',
        input: { method: 'PATCH', operation: 'legacy.nested', params: {}, body: { z: 9, meta: { b: 2, a: 1 } }, expectedVersion: null },
      },
      {
        label: 'array_objects_unordered_keys',
        expectedHash: '4cdb22a207757c952b04f2167134420e1b55a95bf6aa8339b7b8746266b94628',
        input: { method: 'POST', operation: 'legacy.arr.obj', params: {}, body: { items: [{ b: 2, a: 1 }, { c: 'see' }] }, expectedVersion: null },
      },
      {
        label: 'nested_arrays_objects',
        expectedHash: '147144bf1a06dd8deb5d6d7a55c6c11233100524c4ba6472db4d51cafcfe6680',
        input: { method: 'POST', operation: 'legacy.nested.arr', params: {}, body: { groups: [[{ b: 2, a: 1 }], [{ d: 4, c: 3 }]] }, expectedVersion: null },
      },
      {
        label: 'expected_version_present',
        expectedHash: 'eb85876b821eed87ac956f9054e07110913fbd8423d6dc02fc60751d18a38226',
        input: { method: 'PATCH', operation: 'legacy.version', params: {}, body: { title: 'x' }, expectedVersion: 7 },
      },
    ];

    for (const vector of v0Goldens) {
      check(hashIdempotencyRequest(vector.input) === vector.expectedHash,
        `V0 golden unchanged: ${vector.label}`);
    }

    console.log(JSON.stringify({ assertions, results }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
