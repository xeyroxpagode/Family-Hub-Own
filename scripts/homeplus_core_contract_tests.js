'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { OPERATION_KINDS, requireMutationContract, assertExpectedVersionMatches } = require('../backend/src/lib/mutationContracts');
const { createCapabilityCatalog, projectCapabilities, hasCapability } = require('../backend/src/lib/capabilityEngine');
const { resolveHouseholdCapabilities } = require('../backend/src/lib/householdPermissions');
const { resolveCapabilities } = require('../backend/src/lib/plannerCapabilities');
const { legacyBodyToError } = require('../backend/src/middleware/errorEnvelopeMiddleware');
const { requestContextMiddleware } = require('../backend/src/middleware/requestContextMiddleware');

const root = path.resolve(__dirname, '..');
let passed = 0;
function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed += 1;
  console.log(`PASS: ${message}`);
}
function expectCode(fn, code) {
  try { fn(); } catch (error) { return error.code === code; }
  return false;
}
function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

const emptyRequest = { headers: {}, body: {} };
assert(requireMutationContract(emptyRequest, OPERATION_KINDS.READ_ONLY).mutationId === null, 'read-only operations require no mutation headers');
assert(expectCode(() => requireMutationContract(emptyRequest, OPERATION_KINDS.CREATE_IDEMPOTENT), 'mutation_id_required'), 'create operations require a mutation id');
const createRequest = { headers: { 'x-mutation-id': 'mut-1', 'idempotency-key': 'idem-1' }, body: {} };
const createContract = requireMutationContract(createRequest, OPERATION_KINDS.CREATE_IDEMPOTENT);
assert(createContract.expectedVersion === null, 'create operations do not require an entity version');
assert(expectCode(() => requireMutationContract(createRequest, OPERATION_KINDS.VERSIONED_MUTATION), 'expected_version_required'), 'existing-entity mutations require a version');
const updateRequest = { headers: { ...createRequest.headers, 'if-match': '3' }, body: {} };
assert(requireMutationContract(updateRequest, OPERATION_KINDS.VERSIONED_MUTATION).expectedVersion === 3, 'versioned mutation parses If-Match');
assert(expectCode(() => assertExpectedVersionMatches(4, 3), 'version_conflict_v2'), 'version conflict uses the canonical 412 contract');

const catalog = createCapabilityCatalog(['read', 'write']);
const projection = projectCapabilities(catalog, (capability) => capability === 'read');
assert(hasCapability(projection, 'read') && !hasCapability(projection, 'write'), 'generic capability engine projects explicit grants');
assert(!hasCapability(projection, 'unknown'), 'unknown capabilities deny safely');
assert(resolveHouseholdCapabilities('adult').invite_members === true, 'household permissions adopt the shared engine');
assert(resolveHouseholdCapabilities('guest').invite_members === false, 'household capability projection preserves denial');
assert(resolveCapabilities({ role: 'coordinator', membershipStatus: 'active' })['planner.view'] === true, 'Planner adapter preserves its catalog and matrix');

const legacy = legacyBodyToError({ error: 'not_found', message: 'Missing' }, 404);
assert(legacy.code === 'not_found' && legacy.message === 'Missing', 'legacy API errors normalize into canonical error data');
assert(legacyBodyToError({ error: { code: 'canonical' } }, 400).error.code === 'canonical', 'canonical envelopes pass through unchanged');

const contextRequest = { headers: { 'x-request-id': 'auth-request-1', 'x-mutation-id': 'auth-mutation-1' } };
const responseHeaders = {};
requestContextMiddleware(contextRequest, { set: (name, value) => { responseHeaders[name] = value; } }, () => {});
assert(contextRequest.requestId === 'auth-request-1' && responseHeaders['X-Request-Id'] === 'auth-request-1', 'request identity applies outside Planner routes');
assert(contextRequest.mutationId === 'auth-mutation-1' && responseHeaders['X-Mutation-Id'] === 'auth-mutation-1', 'valid mutation identity is uniformly exposed');

const coreBackend = [
  'backend/src/lib/capabilityEngine.js',
  'backend/src/lib/mutationContracts.js',
  'backend/src/lib/httpErrors.js',
  'backend/src/middleware/requestContextMiddleware.js',
  'backend/src/middleware/errorEnvelopeMiddleware.js',
];
assert(coreBackend.every((file) => !/require\([^)]*planner/i.test(read(file))), 'backend Core has no Planner dependency');
const coreFrontendDir = path.join(root, 'front/mi-front-limpio/services/core');
const coreFrontendSources = fs.readdirSync(coreFrontendDir).filter((name) => name.endsWith('.ts')).map((name) => fs.readFileSync(path.join(coreFrontendDir, name), 'utf8'));
assert(coreFrontendSources.every((source) => !/from\s+['"][^'"]*planner/i.test(source)), 'frontend Core has no Planner dependency');
assert(!/plannerCache/.test(read('front/mi-front-limpio/context/AuthContext.tsx')), 'AuthContext does not import Planner cache');
assert(!/plannerCache/.test(read('front/mi-front-limpio/context/HouseholdContext.tsx')), 'HouseholdContext does not import Planner cache');
assert(!/path\.startsWith\(['"]\/api\/planner/.test(read('front/mi-front-limpio/services/api.ts')), 'transport policy does not infer contracts from Planner URL prefixes');

const indexSource = read('backend/index.js');
const requestContextPosition = indexSource.indexOf('requestContextMiddleware');
const firstRoutePosition = indexSource.indexOf("app.use('/api/");
assert(requestContextPosition >= 0 && requestContextPosition < firstRoutePosition, 'request identity middleware is global and precedes routes');
assert(indexSource.indexOf('errorEnvelopeMiddleware') < firstRoutePosition, 'error envelope compatibility is global and precedes routes');
assert(requestContextPosition < indexSource.indexOf('express.json()'), 'request identity also precedes JSON parser failures');

console.log(`\nHOMEPLUS CORE CONTRACTS: ${passed} assertions passed.`);
