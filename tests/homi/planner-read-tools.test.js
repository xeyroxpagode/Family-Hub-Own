'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  HOMI_TOOL_CONTRACT_VERSION,
  HomiToolRegistry,
  createDefaultHomiToolRegistry,
  normalizeToolDefinition,
  validateToolDefinition,
} = require('../../backend/src/homi');

const {
  PLANNER_READ_TOOL_DEFINITIONS,
  PLANNER_READ_TOOL_IDS,
} = require('../../backend/src/homi/tools/plannerReadTools');

const repositoryRoot = path.join(__dirname, '..', '..');
const backendSourceDirectory = path.join(repositoryRoot, 'backend', 'src');
const homiSourceDirectory = path.join(backendSourceDirectory, 'homi');

/**
 * Traceability of every production tool of this slice.
 *
 * `route` is the HTTP path registered by the current Planner route module.
 * `controller` / `operation` are the current controller and business
 * operation modules that back the read. The `transport` entry documents an
 * explicit tool-field → transport-field mapping when the two differ.
 */
const BACKING_OPERATIONS = Object.freeze({
  'planner.tasks.list': {
    route: '/tasks',
    controller: 'backend/src/controllers/planner.tasks.controller.js',
    controllerExport: 'listTasks',
    operation: 'backend/src/services/planner.tasks.service.js',
    operationExport: 'listTasks',
  },
  'planner.tasks.get': {
    route: '/tasks/:id',
    controller: 'backend/src/controllers/planner.tasks.controller.js',
    controllerExport: 'getTaskById',
    operation: 'backend/src/services/planner.tasks.service.js',
    operationExport: 'getTaskById',
  },
  'planner.events.list': {
    route: '/events',
    controller: 'backend/src/controllers/planner.events.controller.js',
    controllerExport: 'listEvents',
    operation: 'backend/src/services/planner.events.service.js',
    operationExport: 'listEvents',
  },
  'planner.events.get': {
    route: '/events/:id',
    controller: 'backend/src/controllers/planner.events.controller.js',
    controllerExport: 'getEventById',
    operation: 'backend/src/services/planner.events.service.js',
    operationExport: 'getEventById',
  },
  'planner.calendar.get': {
    route: '/calendar',
    controller: 'backend/src/controllers/planner.calendar.controller.js',
    controllerExport: 'getCalendar',
    operation: 'backend/src/services/planner.calendar.service.js',
    operationExport: 'getCalendar',
  },
  'planner.summary.get': {
    route: '/summary',
    controller: 'backend/src/controllers/planner.summary.controller.js',
    controllerExport: 'getSummary',
    operation: 'backend/src/services/planner.summary.service.js',
    operationExport: 'getSummary',
  },
  'planner.attention.get': {
    route: '/attention',
    controller: 'backend/src/controllers/planner.attention.controller.js',
    controllerExport: 'getAttention',
    operation: 'backend/src/services/planner.attention.service.js',
    operationExport: 'listAttention',
  },
  'planner.search.query': {
    route: '/search',
    controller: 'backend/src/controllers/planner.search.controller.js',
    controllerExport: 'searchPlanner',
    operation: 'backend/src/services/planner.search.service.js',
    operationExport: 'searchActive',
    transport: {
      toolField: 'query',
      transportField: 'q',
      evidence: 'req.query?.q',
      evidenceNote:
        'the current search controller reads the search term from the `q` query parameter',
    },
  },
});

const REQUIRED_TOOL_IDS = Object.freeze([
  'planner.attention.get',
  'planner.calendar.get',
  'planner.events.get',
  'planner.events.list',
  'planner.search.query',
  'planner.summary.get',
  'planner.tasks.get',
  'planner.tasks.list',
]);

/**
 * Authority identity names that must never appear as a tool argument.
 * Compared on a normalized form (lower case, separators removed) so that
 * `household_id`, `householdId` and `HouseholdID` are all rejected.
 */
const FORBIDDEN_AUTHORITY_FIELDS = Object.freeze([
  'actorid',
  'householdid',
  'membershipid',
  'authuserid',
  'userid',
  'personid',
  'role',
  'accesstoken',
  'token',
  'jwt',
  'authorization',
  'credentials',
]);

const FORBIDDEN_SOURCE_TOKENS = Object.freeze([
  'express',
  'supabase',
  'axios',
  'node-fetch',
  'pg-promise',
]);

function normalizeFieldName(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function readSource(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

function readHomiSource(relativePath) {
  return fs.readFileSync(path.join(homiSourceDirectory, relativePath), 'utf8');
}

/**
 * Collect every property name declared anywhere inside a JSON schema.
 */
function collectSchemaPropertyNames(schema, found = new Set()) {
  if (schema === null || typeof schema !== 'object') return found;

  if (Array.isArray(schema)) {
    for (const entry of schema) collectSchemaPropertyNames(entry, found);
    return found;
  }

  if (schema.properties && typeof schema.properties === 'object') {
    for (const name of Object.keys(schema.properties)) {
      found.add(name);
      collectSchemaPropertyNames(schema.properties[name], found);
    }
  }

  for (const keyword of ['items', 'additionalProperties', 'contains', 'not', 'if', 'then', 'else']) {
    if (schema[keyword] && typeof schema[keyword] === 'object') {
      collectSchemaPropertyNames(schema[keyword], found);
    }
  }

  for (const keyword of ['allOf', 'anyOf', 'oneOf']) {
    if (Array.isArray(schema[keyword])) {
      collectSchemaPropertyNames(schema[keyword], found);
    }
  }

  return found;
}

function requiredSchemaKeys(schema) {
  return new Set(
    Array.isArray(schema && schema.required) ? schema.required.map((entry) => String(entry)) : []
  );
}

function propertyNames(tool) {
  return Object.keys(tool.inputSchema.properties);
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

test('the production catalog holds exactly eight tool definitions', () => {
  assert.equal(PLANNER_READ_TOOL_DEFINITIONS.length, 8);
  assert.equal(PLANNER_READ_TOOL_IDS.length, 8);
  assert.equal(new Set(PLANNER_READ_TOOL_IDS).size, 8);
});

test('the production catalog id set matches the required Planner read set', () => {
  assert.deepEqual(Array.from(PLANNER_READ_TOOL_IDS).sort(), Array.from(REQUIRED_TOOL_IDS).sort());
});

test('every production tool declares the frozen contract envelope', () => {
  for (const tool of PLANNER_READ_TOOL_DEFINITIONS) {
    assert.equal(tool.contractVersion, '1.0.0');
    assert.equal(tool.contractVersion, HOMI_TOOL_CONTRACT_VERSION);
    assert.equal(tool.version, '1.0.0');
    assert.equal(tool.domain, 'planner');
    assert.equal(tool.kind, 'READ');
    assert.deepEqual(Array.from(tool.riskFlags), ['READ_ONLY']);
    assert.equal(tool.confirmation, 'NEVER');
  }
});

test('every production tool description is concise and model usable', () => {
  for (const tool of PLANNER_READ_TOOL_DEFINITIONS) {
    assert.equal(typeof tool.description, 'string');
    assert.ok(tool.description.trim().length > 0);
    assert.ok(tool.description.length <= 200, `${tool.id} description must stay concise`);
    assert.doesNotMatch(tool.description, /select|from|where|insert|update|delete|rpc/i);
  }
});

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

test('the production default registry holds exactly eight tools', () => {
  const registry = createDefaultHomiToolRegistry();

  assert.ok(registry instanceof HomiToolRegistry);
  assert.equal(registry.size, 8);
});

test('every registered tool can be retrieved by id', () => {
  const registry = createDefaultHomiToolRegistry();

  for (const toolId of REQUIRED_TOOL_IDS) {
    const found = registry.get(toolId);
    assert.ok(found, `${toolId} must be registered`);
    assert.equal(found.id, toolId);
  }
});

test('no unexpected tool exists in the production registry', () => {
  const registry = createDefaultHomiToolRegistry();
  const registeredIds = registry.list().map((tool) => tool.id);

  assert.deepEqual(registeredIds.slice().sort(), Array.from(REQUIRED_TOOL_IDS).sort());
  assert.equal(registry.has('planner.goals.list'), false);
  assert.equal(registry.has('planner.tasks.create'), false);
  assert.equal(registry.get('planner.goals.list'), null);
});

test('the production registry lists its tools in a deterministic lexical order', () => {
  const first = createDefaultHomiToolRegistry().list().map((tool) => tool.id);
  const second = createDefaultHomiToolRegistry().list().map((tool) => tool.id);

  assert.deepEqual(first, second);
  assert.deepEqual(first, Array.from(first).slice().sort());
  assert.deepEqual(first, Array.from(REQUIRED_TOOL_IDS).sort());
});

test('fresh factory calls produce independent registries', () => {
  const first = createDefaultHomiToolRegistry();
  const second = createDefaultHomiToolRegistry();

  assert.notEqual(first, second);
  assert.equal(first.size, 8);
  assert.equal(second.size, 8);

  first.register({
    contractVersion: '1.0.0',
    id: 'planner.audit.list',
    version: '1.0.0',
    domain: 'planner',
    description: 'Audit probe tool used to prove registry independence.',
    kind: 'READ',
    riskFlags: ['READ_ONLY'],
    confirmation: 'NEVER',
    inputSchema: { type: 'object', additionalProperties: false, properties: {}, required: [] },
    outputSchema: { type: 'object' },
  });

  assert.equal(first.size, 9);
  assert.equal(second.size, 8);
  assert.equal(second.has('planner.audit.list'), false);
});

test('registered definitions stay immutable', () => {
  const registry = createDefaultHomiToolRegistry();
  const tool = registry.get('planner.tasks.list');

  assert.ok(Object.isFrozen(tool));
  assert.ok(Object.isFrozen(tool.inputSchema));
  assert.ok(Object.isFrozen(tool.inputSchema.properties));
  assert.ok(Object.isFrozen(tool.riskFlags));

  assert.throws(() => {
    'use strict';
    tool.id = 'planner.tasks.create';
  }, TypeError);
  assert.throws(() => {
    'use strict';
    tool.riskFlags.push('DESTRUCTIVE');
  }, TypeError);
  assert.throws(() => {
    'use strict';
    tool.inputSchema.properties.injected = { type: 'string' };
  }, TypeError);

  assert.equal(registry.get('planner.tasks.list').id, 'planner.tasks.list');
  assert.equal(registry.size, 8);
});

// ---------------------------------------------------------------------------
// Identity security
// ---------------------------------------------------------------------------

test('no input schema accepts an actor identity field', () => {
  for (const tool of PLANNER_READ_TOOL_DEFINITIONS) {
    const names = collectSchemaPropertyNames(tool.inputSchema);

    assert.equal(names.has('actor_id'), false, `${tool.id} must not accept actor_id`);
    assert.equal(names.has('actorId'), false, `${tool.id} must not accept actorId`);
  }
});

test('no input schema accepts a household identity field', () => {
  for (const tool of PLANNER_READ_TOOL_DEFINITIONS) {
    const names = collectSchemaPropertyNames(tool.inputSchema);

    assert.equal(names.has('household_id'), false, `${tool.id} must not accept household_id`);
    assert.equal(names.has('householdId'), false, `${tool.id} must not accept householdId`);
  }
});

test('no input schema accepts a membership identity field', () => {
  for (const tool of PLANNER_READ_TOOL_DEFINITIONS) {
    const names = collectSchemaPropertyNames(tool.inputSchema);

    assert.equal(names.has('membership_id'), false, `${tool.id} must not accept membership_id`);
    assert.equal(names.has('membershipId'), false, `${tool.id} must not accept membershipId`);
  }
});

test('no input schema accepts an authenticated user identity field', () => {
  for (const tool of PLANNER_READ_TOOL_DEFINITIONS) {
    const names = collectSchemaPropertyNames(tool.inputSchema);

    assert.equal(names.has('auth_user_id'), false, `${tool.id} must not accept auth_user_id`);
    assert.equal(names.has('authUserId'), false, `${tool.id} must not accept authUserId`);
    assert.equal(names.has('user_id'), false, `${tool.id} must not accept user_id`);
    assert.equal(names.has('userId'), false, `${tool.id} must not accept userId`);
    assert.equal(names.has('person_id'), false, `${tool.id} must not accept person_id`);
    assert.equal(names.has('personId'), false, `${tool.id} must not accept personId`);
  }
});

test('no input schema accepts a role field', () => {
  for (const tool of PLANNER_READ_TOOL_DEFINITIONS) {
    const names = collectSchemaPropertyNames(tool.inputSchema);

    assert.equal(names.has('role'), false, `${tool.id} must not accept role`);
  }
});

test('no input schema accepts a token or credential field', () => {
  for (const tool of PLANNER_READ_TOOL_DEFINITIONS) {
    const names = collectSchemaPropertyNames(tool.inputSchema);

    assert.equal(names.has('accessToken'), false, `${tool.id} must not accept accessToken`);
    assert.equal(names.has('access_token'), false, `${tool.id} must not accept access_token`);
    assert.equal(names.has('token'), false, `${tool.id} must not accept token`);
    assert.equal(names.has('jwt'), false, `${tool.id} must not accept jwt`);
  }
});

test('a recursive scan finds no authority name in any nested input schema', () => {
  for (const tool of PLANNER_READ_TOOL_DEFINITIONS) {
    const names = collectSchemaPropertyNames(tool.inputSchema);

    for (const name of names) {
      const normalized = normalizeFieldName(name);
      assert.equal(
        FORBIDDEN_AUTHORITY_FIELDS.includes(normalized),
        false,
        `${tool.id} must not accept the authority field "${name}"`
      );
    }
  }
});

test('no required input is an authority field', () => {
  for (const tool of PLANNER_READ_TOOL_DEFINITIONS) {
    for (const required of tool.inputSchema.required) {
      assert.equal(
        FORBIDDEN_AUTHORITY_FIELDS.includes(normalizeFieldName(required)),
        false,
        `${tool.id} must not require the authority field "${required}"`
      );
    }
  }
});

// ---------------------------------------------------------------------------
// Tool specific semantics
// ---------------------------------------------------------------------------

test('planner.tasks.list accepts an empty input and exposes only canonical filters', () => {
  const tool = PLANNER_READ_TOOL_DEFINITIONS.find((entry) => entry.id === 'planner.tasks.list');

  assert.deepEqual(tool.inputSchema.required, []);
  assert.equal(tool.inputSchema.type, 'object');
  assert.equal(tool.inputSchema.additionalProperties, false);
  assert.deepEqual(propertyNames(tool).sort(), [
    'from',
    'includeArchived',
    'includeCancelled',
    'limit',
    'status',
    'to',
  ]);

  // The canonical task status set of the current backend Planner constants.
  assert.deepEqual(tool.inputSchema.properties.status.enum.slice().sort(), [
    'awaiting_verification',
    'cancelled',
    'completed',
    'pending',
    'verified',
  ]);

  // The current listing read validates the due-date window as a date only.
  assert.equal(tool.inputSchema.properties.from.pattern, '^\\d{4}-\\d{2}-\\d{2}$');
  assert.equal(tool.inputSchema.properties.to.pattern, '^\\d{4}-\\d{2}-\\d{2}$');

  // The current listing read caps the result set at 100 items.
  assert.equal(tool.inputSchema.properties.limit.maximum, 100);
});

test('planner.tasks.get requires exactly the canonical task identifier', () => {
  const tool = PLANNER_READ_TOOL_DEFINITIONS.find((entry) => entry.id === 'planner.tasks.get');

  assert.deepEqual(tool.inputSchema.required, ['taskId']);
  assert.deepEqual(propertyNames(tool), ['taskId']);
  assert.equal(tool.inputSchema.properties.taskId.type, 'string');
  assert.equal(tool.inputSchema.properties.taskId.minLength, 1);
  assert.equal(tool.outputSchema.type, 'object');
  assert.ok(tool.outputSchema.properties.task);
});

test('planner.events.list reflects the canonical current event filters', () => {
  const tool = PLANNER_READ_TOOL_DEFINITIONS.find((entry) => entry.id === 'planner.events.list');

  assert.deepEqual(tool.inputSchema.required, []);
  assert.deepEqual(propertyNames(tool).sort(), [
    'from',
    'includeCancelled',
    'includeRecurring',
    'status',
    'to',
  ]);
  assert.deepEqual(tool.inputSchema.properties.status.enum.slice().sort(), ['cancelled', 'scheduled']);

  // The current event read parses the window as an ISO instant.
  assert.equal(tool.inputSchema.properties.from.type, 'string');
  assert.equal(tool.inputSchema.properties.to.type, 'string');
  assert.equal(tool.inputSchema.properties.from.minLength, 1);
  assert.equal(tool.inputSchema.properties.to.minLength, 1);

  // The current event read exposes no result limit.
  assert.equal(tool.inputSchema.properties.limit, undefined);
});

test('planner.events.get requires exactly the canonical event identifier', () => {
  const tool = PLANNER_READ_TOOL_DEFINITIONS.find((entry) => entry.id === 'planner.events.get');

  assert.deepEqual(tool.inputSchema.required, ['eventId']);
  assert.deepEqual(propertyNames(tool), ['eventId']);
  assert.equal(tool.inputSchema.properties.eventId.type, 'string');
  assert.equal(tool.inputSchema.properties.eventId.minLength, 1);
  assert.ok(tool.outputSchema.properties.event);
});

test('planner.calendar.get matches the current range semantics', () => {
  const tool = PLANNER_READ_TOOL_DEFINITIONS.find((entry) => entry.id === 'planner.calendar.get');

  assert.deepEqual(tool.inputSchema.required, []);
  assert.deepEqual(propertyNames(tool).sort(), ['date', 'view']);
  assert.deepEqual(tool.inputSchema.properties.view.enum.slice().sort(), ['day', 'month', 'week']);
  assert.equal(tool.inputSchema.properties.date.pattern, '^\\d{4}-\\d{2}-\\d{2}$');
  assert.deepEqual(tool.outputSchema.required.slice().sort(), ['date', 'items', 'range', 'view']);
});

test('planner.summary.get matches the real current input semantics', () => {
  const tool = PLANNER_READ_TOOL_DEFINITIONS.find((entry) => entry.id === 'planner.summary.get');

  assert.deepEqual(tool.inputSchema, {
    type: 'object',
    additionalProperties: false,
    properties: {},
    required: [],
  });
});

test('planner.attention.get matches the real current input semantics', () => {
  const tool = PLANNER_READ_TOOL_DEFINITIONS.find((entry) => entry.id === 'planner.attention.get');

  assert.deepEqual(tool.inputSchema.required, []);
  assert.deepEqual(propertyNames(tool), ['limit']);
  assert.equal(tool.inputSchema.properties.limit.type, 'integer');
  assert.equal(tool.inputSchema.properties.limit.maximum, 100);

  // The aggregated payment source selectors are internal to the attention read.
  assert.equal(tool.inputSchema.properties.entityType, undefined);
  assert.equal(tool.inputSchema.properties.todayDate, undefined);
  assert.equal(tool.inputSchema.properties.reason, undefined);
});

test('planner.search.query requires the canonical search term', () => {
  const tool = PLANNER_READ_TOOL_DEFINITIONS.find((entry) => entry.id === 'planner.search.query');

  assert.deepEqual(tool.inputSchema.required, ['query']);
  assert.equal(tool.inputSchema.properties.query.type, 'string');
  assert.equal(tool.inputSchema.properties.query.minLength, 1);

  // The internal search context switch is not exposed.
  assert.equal(tool.inputSchema.properties.context, undefined);
  assert.deepEqual(propertyNames(tool).sort(), ['limit', 'query']);
});

// ---------------------------------------------------------------------------
// Contract integration
// ---------------------------------------------------------------------------

test('every production tool passes validateToolDefinition', () => {
  for (const tool of PLANNER_READ_TOOL_DEFINITIONS) {
    assert.equal(validateToolDefinition(tool), true, `${tool.id} must satisfy the contract`);
  }
});

test('every production tool survives normalization', () => {
  for (const tool of PLANNER_READ_TOOL_DEFINITIONS) {
    const normalized = normalizeToolDefinition(tool);

    assert.equal(normalized.id, tool.id);
    assert.equal(normalized.contractVersion, '1.0.0');
    assert.deepEqual(Array.from(normalized.riskFlags), ['READ_ONLY']);
    assert.ok(Object.isFrozen(normalized));
  }
});

test('every production tool survives a JSON round trip', () => {
  for (const tool of PLANNER_READ_TOOL_DEFINITIONS) {
    const normalized = normalizeToolDefinition(tool);
    const roundTripped = JSON.parse(JSON.stringify(normalized));

    assert.deepEqual(roundTripped, normalized);
    assert.equal(validateToolDefinition(roundTripped), true);
  }
});

test('unknown input fields are structurally forbidden', () => {
  for (const tool of PLANNER_READ_TOOL_DEFINITIONS) {
    assert.equal(tool.inputSchema.additionalProperties, false, `${tool.id} must forbid extras`);
    assert.equal(tool.inputSchema.type, 'object');

    for (const required of tool.inputSchema.required) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(tool.inputSchema.properties, required),
        `${tool.id} must declare every required property`
      );
    }
  }
});

test('no WRITE tool exists in the production default registry', () => {
  const registry = createDefaultHomiToolRegistry();

  for (const tool of registry.list()) {
    assert.equal(tool.kind, 'READ', `${tool.id} must stay READ`);
    assert.equal(tool.confirmation, 'NEVER');
    assert.deepEqual(Array.from(tool.riskFlags), ['READ_ONLY']);
  }
});

// ---------------------------------------------------------------------------
// Architectural purity
// ---------------------------------------------------------------------------

const PRODUCTION_HOMI_FILES = Object.freeze([
  'backend/src/homi/tools/plannerReadTools.js',
  'backend/src/homi/defaultRegistry.js',
]);

test('the production Homi files import no Planner controller, operation or route module', () => {
  for (const relativePath of PRODUCTION_HOMI_FILES) {
    const source = readSource(relativePath);
    const specifiers = Array.from(source.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)).map(
      (match) => match[1]
    );

    for (const specifier of specifiers) {
      assert.doesNotMatch(
        specifier,
        /controller|service|routes|\.sql$|\.service\b/i,
        `${relativePath} must not require "${specifier}"`
      );
    }
  }
});

test('the production Homi files import no HTTP, database or transport dependency', () => {
  for (const relativePath of PRODUCTION_HOMI_FILES) {
    const source = readSource(relativePath);
    const specifiers = Array.from(source.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)).map(
      (match) => match[1]
    );

    for (const specifier of specifiers) {
      for (const token of FORBIDDEN_SOURCE_TOKENS) {
        assert.equal(
          specifier.toLowerCase().includes(token),
          false,
          `${relativePath} must not require "${specifier}"`
        );
      }
    }

    for (const token of FORBIDDEN_SOURCE_TOKENS) {
      assert.doesNotMatch(
        source,
        new RegExp(`\\b${token.replace(/[-.]/g, '\\$&')}\\b`, 'i'),
        `${relativePath} must not mention "${token}"`
      );
    }
  }
});

test('the production Homi files perform no network call and no SQL or RPC execution', () => {
  for (const relativePath of PRODUCTION_HOMI_FILES) {
    const source = readSource(relativePath);

    assert.doesNotMatch(source, /\b(fetch|XMLHttpRequest)\s*\(/, `${relativePath} must not call the network`);
    assert.doesNotMatch(source, /\.rpc\s*\(/, `${relativePath} must not invoke a remote procedure`);
    assert.doesNotMatch(source, /\bselect\b[\s\S]*\bfrom\b/i, `${relativePath} must not embed SQL`);
    assert.doesNotMatch(source, /\binsert\s+into\b/i, `${relativePath} must not embed SQL`);
    assert.doesNotMatch(source, /\bdelete\s+from\b/i, `${relativePath} must not embed SQL`);
    assert.doesNotMatch(source, /\bupdate\b[\s\S]*\bset\b/i, `${relativePath} must not embed SQL`);
  }
});

test('the production Homi files expose no execution, binding or dispatch entry point', () => {
  for (const relativePath of PRODUCTION_HOMI_FILES) {
    const source = readSource(relativePath);

    assert.doesNotMatch(
      source,
      /\b(executeTool|invokeTool|dispatchTool|runTool|callTool|handlerMap|toolHandlers|handlersByTool)\b/,
      `${relativePath} must not declare an execution entry point`
    );
    assert.doesNotMatch(
      source,
      /\bfunction\s+(execute|invoke|dispatch|run|call|handle)\w*\s*\(/i,
      `${relativePath} must not declare an execution function`
    );
  }

  const catalogExports = Object.keys(require('../../backend/src/homi/tools/plannerReadTools'));
  const registryExports = Object.keys(require('../../backend/src/homi/defaultRegistry'));

  for (const exported of catalogExports.concat(registryExports)) {
    assert.doesNotMatch(
      exported,
      /execute|invoke|dispatch|handler|runner/i,
      `the exported name "${exported}" must not describe an execution entry point`
    );
  }
});

// ---------------------------------------------------------------------------
// Traceability against the current HomePlus Planner authority
// ---------------------------------------------------------------------------

test('every production tool is backed by a current Planner read operation', () => {
  const routeSource = readSource('backend/src/routes/planner.js');

  for (const tool of PLANNER_READ_TOOL_DEFINITIONS) {
    const backing = BACKING_OPERATIONS[tool.id];

    assert.ok(backing, `${tool.id} must declare its backing operation`);

    assert.ok(
      fs.existsSync(path.join(repositoryRoot, backing.controller)),
      `${tool.id} backing controller must exist`
    );
    assert.ok(
      fs.existsSync(path.join(repositoryRoot, backing.operation)),
      `${tool.id} backing operation module must exist`
    );

    assert.ok(
      routeSource.includes(`router.get('${backing.route}'`),
      `${tool.id} must be registered by the current Planner route module`
    );
    assert.ok(
      readSource(backing.controller).includes(backing.controllerExport),
      `${tool.id} must be backed by the declared controller operation`
    );
    assert.ok(
      readSource(backing.operation).includes(backing.operationExport),
      `${tool.id} must be backed by the declared business operation`
    );
  }
});

test('the search tool field maps explicitly onto the current transport parameter', () => {
  const backing = BACKING_OPERATIONS['planner.search.query'];
  const controllerSource = readSource(backing.controller);
  const tool = PLANNER_READ_TOOL_DEFINITIONS.find((entry) => entry.id === 'planner.search.query');

  assert.equal(backing.transport.toolField, 'query');
  assert.equal(backing.transport.transportField, 'q');
  assert.ok(
    controllerSource.includes(backing.transport.evidence),
    'the transport mapping must be evidenced by the current controller'
  );
  assert.equal(tool.inputSchema.properties.q, undefined);
  assert.equal(tool.inputSchema.properties.query.type, 'string');
});
