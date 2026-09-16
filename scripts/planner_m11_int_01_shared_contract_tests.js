#!/usr/bin/env node
'use strict';

const MODE = process.argv.includes('--check-only') ? 'check' : 'full';

let assertions = 0;

function check(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
    return;
  }
  assertions += 1;
  console.log(`PASS: ${message}`);
}

// ── Section 1: Node syntax gates ──

check(true, 'contract tests syntax OK');

// ── Section 2: hashIdempotencyRequestV2 JS vectors ──

const crypto = require('crypto');

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const canonicalizeV2Value = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeV2Value(item));
  }
  if (!isPlainObject(value)) return value;
  const sorted = {};
  Object.keys(value).sort().forEach((k) => { sorted[k] = canonicalizeV2Value(value[k]); });
  return sorted;
};

const hashIdempotencyRequestV2 = ({
  operation, scopeType, scopeId, targetId,
  payload, expectedVersion, mutationId,
}) => {
  const canonical = canonicalizeV2Value({
    operation: operation ?? '',
    scope_type: scopeType ?? '',
    scope_id: scopeId ?? null,
    target_id: targetId ?? null,
    payload: payload ?? null,
    expected_version: expectedVersion ?? null,
    mutation_id: mutationId ?? '',
  });
  const stripped = JSON.stringify(canonical, (key, value) =>
    value === null ? undefined : value
  );
  return crypto.createHash('sha256').update(stripped).digest('hex');
};

// Basic hash
const h1 = hashIdempotencyRequestV2({
  operation: 'planner.test.op',
  scopeType: 'personal',
  scopeId: '00000000-0000-0000-0000-000000000001',
  targetId: null,
  payload: { title: 'Test' },
  expectedVersion: null,
  mutationId: 'req-001',
});

check(typeof h1 === 'string' && h1.length === 64, 'SHARED-HASH-01: hash is 64-char hex string');
check(/^[a-f0-9]{64}$/.test(h1), 'SHARED-HASH-02: hash is lowercase hex');

// Deterministic same input
const h1b = hashIdempotencyRequestV2({
  operation: 'planner.test.op',
  scopeType: 'personal',
  scopeId: '00000000-0000-0000-0000-000000000001',
  targetId: null,
  payload: { title: 'Test' },
  expectedVersion: null,
  mutationId: 'req-001',
});
check(h1 === h1b, 'SHARED-HASH-03: same input produces same hash');

// Different payload => different hash
const h2 = hashIdempotencyRequestV2({
  operation: 'planner.test.op',
  scopeType: 'personal',
  scopeId: '00000000-0000-0000-0000-000000000001',
  targetId: null,
  payload: { title: 'Other' },
  expectedVersion: null,
  mutationId: 'req-001',
});
check(h1 !== h2, 'SHARED-HASH-04: different payload produces different hash');

// Keys in different order (title first vs title last) => same hash
const h3 = hashIdempotencyRequestV2({
  operation: 'planner.test.op',
  scopeType: 'personal',
  scopeId: '00000000-0000-0000-0000-000000000001',
  targetId: null,
  payload: { description: 'desc', title: 'Test' },
  expectedVersion: null,
  mutationId: 'req-001',
});

const h3b = hashIdempotencyRequestV2({
  operation: 'planner.test.op',
  scopeType: 'personal',
  scopeId: '00000000-0000-0000-0000-000000000001',
  targetId: null,
  payload: { title: 'Test', description: 'desc' },
  expectedVersion: null,
  mutationId: 'req-001',
});
check(h3 === h3b, 'SHARED-HASH-05: key order does not affect hash');

// Nested objects
const h4 = hashIdempotencyRequestV2({
  operation: 'planner.test.op',
  scopeType: 'personal',
  scopeId: '00000000-0000-0000-0000-000000000001',
  targetId: null,
  payload: { meta: { a: 1, b: 2 }, title: 'Test' },
  expectedVersion: null,
  mutationId: 'req-001',
});

const h4b = hashIdempotencyRequestV2({
  operation: 'planner.test.op',
  scopeType: 'personal',
  scopeId: '00000000-0000-0000-0000-000000000001',
  targetId: null,
  payload: { title: 'Test', meta: { b: 2, a: 1 } },
  expectedVersion: null,
  mutationId: 'req-001',
});
check(h4 === h4b, 'SHARED-HASH-06: nested key order does not affect hash');

// Arrays
const h5 = hashIdempotencyRequestV2({
  operation: 'planner.test.op',
  scopeType: 'personal',
  scopeId: '00000000-0000-0000-0000-000000000001',
  targetId: null,
  payload: { tags: ['a', 'b', 'c'] },
  expectedVersion: null,
  mutationId: 'req-001',
});

const h5b = hashIdempotencyRequestV2({
  operation: 'planner.test.op',
  scopeType: 'personal',
  scopeId: '00000000-0000-0000-0000-000000000001',
  targetId: null,
  payload: { tags: ['c', 'b', 'a'] },
  expectedVersion: null,
  mutationId: 'req-001',
});
check(h5 !== h5b, 'SHARED-HASH-07: different array order produces different hash');

// Null payload
const h6 = hashIdempotencyRequestV2({
  operation: 'planner.test.op',
  scopeType: 'personal',
  scopeId: '00000000-0000-0000-0000-000000000001',
  targetId: null,
  payload: null,
  expectedVersion: null,
  mutationId: 'req-001',
});
check(typeof h6 === 'string' && h6.length === 64, 'SHARED-HASH-08: null payload produces valid hash');

// Boolean in payload
const h7 = hashIdempotencyRequestV2({
  operation: 'planner.test.op',
  scopeType: 'personal',
  scopeId: '00000000-0000-0000-0000-000000000001',
  targetId: null,
  payload: { enabled: true, count: 42 },
  expectedVersion: null,
  mutationId: 'req-001',
});
check(typeof h7 === 'string' && h7.length === 64, 'SHARED-HASH-09: boolean in payload produces valid hash');

// Empty string in payload
const h8 = hashIdempotencyRequestV2({
  operation: 'planner.test.op',
  scopeType: 'personal',
  scopeId: '00000000-0000-0000-0000-000000000001',
  targetId: null,
  payload: { description: '' },
  expectedVersion: null,
  mutationId: 'req-001',
});
check(typeof h8 === 'string' && h8.length === 64, 'SHARED-HASH-10: empty string in payload produces valid hash');

// Unicode
const h9 = hashIdempotencyRequestV2({
  operation: 'planner.test.op',
  scopeType: 'personal',
  scopeId: '00000000-0000-0000-0000-000000000001',
  targetId: null,
  payload: { title: 'Español ñ ü' },
  expectedVersion: null,
  mutationId: 'req-001',
});
check(typeof h9 === 'string' && h9.length === 64, 'SHARED-HASH-11: Unicode in payload produces valid hash');

// Integer in expected version
const h10 = hashIdempotencyRequestV2({
  operation: 'planner.edit',
  scopeType: 'household',
  scopeId: '00000000-0000-0000-0000-000000000002',
  targetId: '00000000-0000-0000-0000-000000000003',
  payload: { title: 'Updated' },
  expectedVersion: 5,
  mutationId: 'req-010',
});
check(typeof h10 === 'string' && h10.length === 64, 'SHARED-HASH-12: expected version in hash works');

// Household scope hash
const hh1 = hashIdempotencyRequestV2({
  operation: 'planner.events.create',
  scopeType: 'household',
  scopeId: '00000000-0000-0000-0000-000000000010',
  targetId: null,
  payload: { title: 'Event', date: '2026-07-22' },
  expectedVersion: null,
  mutationId: 'evt-001',
});
check(typeof hh1 === 'string' && hh1.length === 64, 'SHARED-HASH-13: household scope hash works');

// Household != personal
const hp1 = hashIdempotencyRequestV2({
  operation: 'planner.events.create',
  scopeType: 'personal',
  scopeId: '00000000-0000-0000-0000-000000000001',
  targetId: null,
  payload: { title: 'Event', date: '2026-07-22' },
  expectedVersion: null,
  mutationId: 'evt-001',
});
check(hh1 !== hp1, 'SHARED-HASH-14: household and personal scope produce different hashes');

const arrayObjectUnordered = hashIdempotencyRequestV2({
  operation: 'arr.object.qa',
  scopeType: 'personal',
  scopeId: '00000000-0000-0000-0000-000000000001',
  targetId: null,
  payload: { items: [{ b: 2, a: 1 }, { c: 'see' }] },
  expectedVersion: null,
  mutationId: 'req-array-object',
});
const arrayObjectOrdered = hashIdempotencyRequestV2({
  operation: 'arr.object.qa',
  scopeType: 'personal',
  scopeId: '00000000-0000-0000-0000-000000000001',
  targetId: null,
  payload: { items: [{ a: 1, b: 2 }, { c: 'see' }] },
  expectedVersion: null,
  mutationId: 'req-array-object',
});
check(arrayObjectUnordered === arrayObjectOrdered,
  'SHARED-HASH-15: object key order inside arrays does not affect V2 hash');

const arrayObjectInverted = hashIdempotencyRequestV2({
  operation: 'arr.object.qa',
  scopeType: 'personal',
  scopeId: '00000000-0000-0000-0000-000000000001',
  targetId: null,
  payload: { items: [{ c: 'see' }, { a: 1, b: 2 }] },
  expectedVersion: null,
  mutationId: 'req-array-object',
});
check(arrayObjectOrdered !== arrayObjectInverted,
  'SHARED-HASH-16: array order with objects remains significant');

const nestedArrayCases = [
  {
    label: 'array_of_arrays',
    left: { groups: [[{ b: 2, a: 1 }], [{ d: 4, c: 3 }]] },
    right: { groups: [[{ a: 1, b: 2 }], [{ c: 3, d: 4 }]] },
  },
  {
    label: 'array_object_with_array',
    left: { items: [{ tags: [{ z: 26, a: 1 }, { b: 2 }] }] },
    right: { items: [{ tags: [{ a: 1, z: 26 }, { b: 2 }] }] },
  },
  {
    label: 'object_with_array_of_objects',
    left: { wrapper: { items: [{ y: 2, x: 1 }, { beta: true, alpha: false }] } },
    right: { wrapper: { items: [{ x: 1, y: 2 }, { alpha: false, beta: true }] } },
  },
  {
    label: 'array_object_nested_object',
    left: { items: [{ meta: { z: 'last', a: 'first' } }] },
    right: { items: [{ meta: { a: 'first', z: 'last' } }] },
  },
  {
    label: 'array_object_nested_array_objects',
    left: { items: [{ children: [{ two: 2, one: 1 }] }] },
    right: { items: [{ children: [{ one: 1, two: 2 }] }] },
  },
];

for (const vector of nestedArrayCases) {
  const leftHash = hashIdempotencyRequestV2({
    operation: `arr.nested.${vector.label}`,
    scopeType: 'personal',
    scopeId: '00000000-0000-0000-0000-000000000001',
    targetId: null,
    payload: vector.left,
    expectedVersion: null,
    mutationId: 'req-array-nested',
  });
  const rightHash = hashIdempotencyRequestV2({
    operation: `arr.nested.${vector.label}`,
    scopeType: 'personal',
    scopeId: '00000000-0000-0000-0000-000000000001',
    targetId: null,
    payload: vector.right,
    expectedVersion: null,
    mutationId: 'req-array-nested',
  });
  check(leftHash === rightHash,
    `SHARED-HASH-17-${vector.label}: nested array object keys canonicalize recursively`);
}

const mutationPayload = { items: [{ b: 2, a: 1 }, { c: 'see' }] };
const mutationPayloadBefore = JSON.stringify(mutationPayload);
const mutationFirstKeysBefore = Object.keys(mutationPayload.items[0]).join(',');
hashIdempotencyRequestV2({
  operation: 'arr.object.no_mutation',
  scopeType: 'personal',
  scopeId: '00000000-0000-0000-0000-000000000001',
  targetId: null,
  payload: mutationPayload,
  expectedVersion: null,
  mutationId: 'req-array-no-mutation',
});
check(JSON.stringify(mutationPayload) === mutationPayloadBefore,
  'SHARED-HASH-18: V2 hash does not mutate original payload values or array order');
check(Object.keys(mutationPayload.items[0]).join(',') === mutationFirstKeysBefore,
  'SHARED-HASH-19: V2 hash does not mutate original object key order');

// ── Section 3: Mutation contract helpers ──

const {
  sanitizeCorrelationId,
  requireMutationId,
  requireIdempotencyKey,
  parseIdempotencyKey,
  OPERATION_KINDS,
  OPERATION_POLICIES,
  CANONICAL_ERROR_CODES,
  LEGACY_ERROR_ALIASES,
  normalizeErrorCode,
  createIdempotencyConflictError,
  createIdempotencyInFlightError,
} = require('../backend/src/lib/mutationContracts');

// Canonical error codes exist
check(CANONICAL_ERROR_CODES.IDEMPOTENCY_CONFLICT === 'idempotency_conflict',
  'CONTRACT-01: idempotency_conflict canon defined');
check(CANONICAL_ERROR_CODES.IDEMPOTENCY_IN_FLIGHT === 'idempotency_in_flight',
  'CONTRACT-02: idempotency_in_flight canon defined');
check(CANONICAL_ERROR_CODES.VERSION_CONFLICT_V2 === 'version_conflict_v2',
  'CONTRACT-03: version_conflict_v2 canon defined');
check(CANONICAL_ERROR_CODES.MUTATION_ID_REQUIRED === 'mutation_id_required',
  'CONTRACT-04: mutation_id_required canon defined');
check(CANONICAL_ERROR_CODES.INTERNAL_ERROR === 'internal_error',
  'CONTRACT-05: internal_error canon defined');

// Legacy aliases map correctly
check(LEGACY_ERROR_ALIASES.idempotency_key_conflict === 'idempotency_conflict',
  'CONTRACT-06: legacy idempotency_key_conflict maps to idempotency_conflict');
check(LEGACY_ERROR_ALIASES.version_conflict === 'version_conflict_v2',
  'CONTRACT-07: legacy version_conflict maps to version_conflict_v2');

// normalizeErrorCode
check(normalizeErrorCode('idempotency_key_conflict') === 'idempotency_conflict',
  'CONTRACT-08: normalize maps legacy to canonical');
check(normalizeErrorCode('version_conflict') === 'version_conflict_v2',
  'CONTRACT-09: normalize maps version_conflict to version_conflict_v2');
check(normalizeErrorCode('forbidden') === 'forbidden',
  'CONTRACT-10: normalize passes through new canon codes');

// createIdempotencyConflictError
const conflictErr = createIdempotencyConflictError('test conflict');
check(conflictErr.statusCode === 409, 'CONTRACT-11: conflict error is 409');
check(conflictErr.code === 'idempotency_conflict', 'CONTRACT-12: conflict error code is canonical');

// createIdempotencyInFlightError
const flightErr = createIdempotencyInFlightError('test in flight', 5);
check(flightErr.statusCode === 409, 'CONTRACT-13: in-flight error is 409');
check(flightErr.code === 'idempotency_in_flight', 'CONTRACT-14: in-flight error code is canonical');

// Sanitize mutation ID
check(sanitizeCorrelationId('req-123.abc_test:X-Y') === 'req-123.abc_test:X-Y',
  'CONTRACT-15: valid mutation ID passes');
check(sanitizeCorrelationId('') === null, 'CONTRACT-16: empty mutation ID is null');
check(sanitizeCorrelationId('   ') === null, 'CONTRACT-17: whitespace mutation ID is null');
check(sanitizeCorrelationId(null) === null, 'CONTRACT-18: null mutation ID is null');
check(sanitizeCorrelationId('<script>') === null, 'CONTRACT-19: unsafe chars rejected');

// OPERATION_KINDS
check(OPERATION_KINDS.CREATE_IDEMPOTENT === 'CREATE_IDEMPOTENT',
  'CONTRACT-20: CREATE_IDEMPOTENT kind exists');
check(OPERATION_KINDS.VERSIONED_MUTATION === 'VERSIONED_MUTATION',
  'CONTRACT-21: VERSIONED_MUTATION kind exists');

// ── Section 4: HTTP error envelope ──

const { buildApiErrorEnvelope } = require('../backend/src/lib/httpErrors');

const reqStub = { requestId: 'req-stub-001' };

// Normal 4xx
const e404 = { statusCode: 404, message: 'Not found', code: 'not_found' };
const env404 = buildApiErrorEnvelope(e404, reqStub);
check(env404.envelope.error.code === 'not_found', 'ENVELOPE-01: normal error code preserved');
check(env404.envelope.error.message === 'Not found', 'ENVELOPE-02: normal error message preserved');
check(env404.envelope.error.request_id === 'req-stub-001', 'ENVELOPE-03: request_id forwarded');
check(!env404.envelope.error.details, 'ENVELOPE-04: no details without explicit details');

const e422 = { statusCode: 422, message: 'Bad', code: 'validation_error', details: { field: 'title' } };
const env422 = buildApiErrorEnvelope(e422);
check(env422.envelope.error.details.field === 'title', 'ENVELOPE-05: details forwarded for 4xx');

// 500 internal
const e500 = { statusCode: 500, message: 'SQL ERROR: constraint xyz', code: '23505',
  details: { constraint: 'xyz' }, hint: 'some hint', stack: 'stack trace' };
const env500 = buildApiErrorEnvelope(e500, reqStub);
check(env500.envelope.error.code === '23505', 'ENVELOPE-06: error code preserved (caller trust)');
check(env500.envelope.error.message === 'Error interno.', 'ENVELOPE-07: 500 message is internal placeholder');
check(env500.envelope.error.request_id === 'req-stub-001', 'ENVELOPE-08: request_id preserved for 500');
check(!env500.envelope.error.details, 'ENVELOPE-09: NO details for 500');
check(!env500.envelope.error.hint, 'ENVELOPE-10: NO hint leaked');
check(!env500.envelope.error.stack, 'ENVELOPE-11: NO stack leaked');
check(!env500.envelope.error.constraint, 'ENVELOPE-12: NO raw constraint leaked');
check(!env500.envelope.error.SQLSTATE, 'ENVELOPE-13: NO SQLSTATE leaked');

// No requestId
const eNoReq = { statusCode: 400, message: 'Bad', code: 'bad' };
const envNoReq = buildApiErrorEnvelope(eNoReq, {});
check(envNoReq.envelope.error.request_id === null, 'ENVELOPE-14: null request_id when no req');

// ── Section 5: Planner mutation contracts re-exports ──

const { PLANNER_MUTATION_POLICIES } = require('../backend/src/lib/plannerMutationContracts');
check(PLANNER_MUTATION_POLICIES.create.mutationId === 'required', 'PMC-01: create policy requires mutationId');
check(PLANNER_MUTATION_POLICIES.create.idempotency === 'required', 'PMC-02: create policy requires idempotency');
check(PLANNER_MUTATION_POLICIES.existingEntity.version === 'required', 'PMC-03: existingEntity policy requires version');

// ── Section 6: plannerIdempotencyAdapter V2 exports ──

const adapter = require('../backend/src/lib/plannerIdempotencyAdapter');

// Legacy exports preserved
check(typeof adapter.parseIdempotencyKey === 'function', 'ADAPTER-01: parseIdempotencyKey legacy export preserved');
check(typeof adapter.requireIdempotencyKey === 'function', 'ADAPTER-02: requireIdempotencyKey legacy export preserved');
check(typeof adapter.hashIdempotencyRequest === 'function', 'ADAPTER-03: hashIdempotencyRequest legacy export preserved');
check(typeof adapter.withIdempotency === 'function', 'ADAPTER-04: withIdempotency legacy export preserved');
check(typeof adapter.mapRpcError === 'function', 'ADAPTER-05: mapRpcError legacy export preserved');

// V2 exports exist
check(typeof adapter.hashIdempotencyRequestV2 === 'function', 'ADAPTER-06: hashIdempotencyRequestV2 V2 export exists');
check(typeof adapter.invokeAtomicPlannerMutationV2 === 'function', 'ADAPTER-07: invokeAtomicPlannerMutationV2 V2 atomic frontier exists');
check(typeof adapter.mapV2RpcError === 'function', 'ADAPTER-08: mapV2RpcError V2 export exists');
check(typeof adapter.callV2ReserveRpc === 'function', 'ADAPTER-09: callV2ReserveRpc internal helper exists');
check(typeof adapter.callV2CompleteRpc === 'function', 'ADAPTER-10: callV2CompleteRpc internal helper exists');
check(adapter.V2IdempotencyOutcome && adapter.V2IdempotencyOutcome.RESERVED === 'reserved',
  'ADAPTER-11: V2IdempotencyOutcome exists');

// No non-atomic withIdempotencyV2 exported as productive frontier
check(adapter.withIdempotencyV2 === undefined, 'ADAPTER-12: withIdempotencyV2 NOT exported as productive frontier');

// P0010 ambiguous recovery mapping
const p0010Error = adapter.mapV2RpcError({ code: 'P0010' }, 'test_op');
check(p0010Error.code === CANONICAL_ERROR_CODES.IDEMPOTENCY_CONFLICT,
  'ADAPTER-13: P0010 maps to idempotency_conflict');

// Legacy hashIdempotencyRequest works (V0 compatibility)
const hV0 = adapter.hashIdempotencyRequest({
  method: 'POST', operation: 'test', params: {}, body: { a: 1 }, expectedVersion: null,
});
check(typeof hV0 === 'string' && hV0.length === 64, 'ADAPTER-12: legacy hashIdempotencyRequest works');

const legacyHashGoldenVectors = [
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
    label: 'array_primitives',
    expectedHash: 'b64edafa34480e1dc076258e42f6ac3a0b48af0e30180c81f28fec4b4e26aadb',
    input: { method: 'POST', operation: 'legacy.arr.prim', params: {}, body: { tags: ['a', 'b', 'c'] }, expectedVersion: null },
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
    label: 'params_with_arrays',
    expectedHash: '78e9f31b8257475d60b4bc5e65361854ca3dbc2b68f06b67d2354e51b9bffc45',
    input: { method: 'GET', operation: 'legacy.params', params: { filters: [{ b: 2, a: 1 }], page: 1 }, body: null, expectedVersion: null },
  },
  {
    label: 'expected_version_present',
    expectedHash: 'eb85876b821eed87ac956f9054e07110913fbd8423d6dc02fc60751d18a38226',
    input: { method: 'PATCH', operation: 'legacy.version', params: {}, body: { title: 'x' }, expectedVersion: 7 },
  },
  {
    label: 'body_null',
    expectedHash: '8f58a7ae626e8f87082036603df4b7a6f22eaafc380e7c2f79f1ee43a05a611e',
    input: { method: 'DELETE', operation: 'legacy.null', params: { id: '00000000-0000-0000-0000-000000000001' }, body: null, expectedVersion: null },
  },
];

for (const vector of legacyHashGoldenVectors) {
  check(adapter.hashIdempotencyRequest(vector.input) === vector.expectedHash,
    `ADAPTER-V0-GOLDEN-${vector.label}: legacy hash unchanged`);
}

// V2 hashIdempotencyRequestV2 matches the locally computed hash
const hV2Local = hashIdempotencyRequestV2({
  operation: 'planner.test.op',
  scopeType: 'personal',
  scopeId: '00000000-0000-0000-0000-000000000001',
  targetId: null,
  payload: { title: 'Test' },
  expectedVersion: null,
  mutationId: 'req-001',
});
const hV2Adapter = adapter.hashIdempotencyRequestV2({
  operation: 'planner.test.op',
  scopeType: 'personal',
  scopeId: '00000000-0000-0000-0000-000000000001',
  targetId: null,
  payload: { title: 'Test' },
  expectedVersion: null,
  mutationId: 'req-001',
});
check(hV2Local === hV2Adapter, 'ADAPTER-13: V2 hash matches local reference implementation');

const adapterArrayObjectUnordered = adapter.hashIdempotencyRequestV2({
  operation: 'arr.object.qa',
  scopeType: 'personal',
  scopeId: '00000000-0000-0000-0000-000000000001',
  targetId: null,
  payload: { items: [{ b: 2, a: 1 }, { c: 'see' }] },
  expectedVersion: null,
  mutationId: 'req-array-object',
});
const adapterArrayObjectOrdered = adapter.hashIdempotencyRequestV2({
  operation: 'arr.object.qa',
  scopeType: 'personal',
  scopeId: '00000000-0000-0000-0000-000000000001',
  targetId: null,
  payload: { items: [{ a: 1, b: 2 }, { c: 'see' }] },
  expectedVersion: null,
  mutationId: 'req-array-object',
});
const adapterArrayObjectInverted = adapter.hashIdempotencyRequestV2({
  operation: 'arr.object.qa',
  scopeType: 'personal',
  scopeId: '00000000-0000-0000-0000-000000000001',
  targetId: null,
  payload: { items: [{ c: 'see' }, { a: 1, b: 2 }] },
  expectedVersion: null,
  mutationId: 'req-array-object',
});
check(adapterArrayObjectUnordered === adapterArrayObjectOrdered,
  'ADAPTER-14: V2 adapter canonicalizes object keys inside arrays');
check(adapterArrayObjectOrdered !== adapterArrayObjectInverted,
  'ADAPTER-15: V2 adapter preserves array order with object elements');

// ── Section 7: planner.context.service V2 exports (syntax-only check) ──
// Cannot require at module level due to @supabase/supabase-js dependency;
// node --check validates syntax. The source file is checked above in SYNTAX gates.

// ── Section 8: node --check syntax gates ──

const { execSync } = require('child_process');

function runNodeCheck(file) {
  try {
    execSync(`node --check "${file}"`, { stdio: 'pipe', timeout: 10000 });
    check(true, `SYNTAX-OK: ${file}`);
  } catch (e) {
    check(false, `SYNTAX-FAIL: ${file} — ${e.stderr?.toString()?.trim() || e.message}`);
  }
}

runNodeCheck('backend/src/lib/plannerIdempotencyAdapter.js');
runNodeCheck('backend/src/lib/mutationContracts.js');
runNodeCheck('backend/src/lib/plannerMutationContracts.js');
runNodeCheck('backend/src/lib/httpErrors.js');
runNodeCheck('backend/src/services/planner.context.service.js');
runNodeCheck('scripts/planner_m11_int_01_shared_contract_tests.js');
runNodeCheck('scripts/planner_m11_int_01_shared_database_tests.js');
runNodeCheck('scripts/planner_m11_int_01_shared_test_runner.js');

// ── Summary ──

console.log(`\nCONTRACT TESTS: ${assertions} assertions`);
if (process.exitCode !== 0 && process.exitCode !== undefined) {
  console.log('VERDICT: FAIL');
} else {
  console.log('VERDICT: PASS');
}

if (MODE === 'check') {
  process.exit(process.exitCode || 0);
}

module.exports = { assertions };
