'use strict';

/**
 * HomePlus Homi Tool Layer — tool execution tests (T07-S4).
 *
 * These tests cover the executable side of the Homi Tool Layer:
 *   - the executor order and its error taxonomy;
 *   - the strict runtime argument validation;
 *   - the eight Planner READ adapters and the service authority they use;
 *   - the security boundary of the new modules;
 *   - the observability events.
 *
 * No live database and no runtime dependency is required: the canonical
 * context resolver and the business services are injected as doubles, exactly
 * like the production modules accept them.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { spawnSync } = require('node:child_process');

const {
  HOMI_AUTH_CONTEXT_INVALID,
  HOMI_CLAIM_INVALID,
  HOMI_CONTEXT_MISMATCH,
  createDefaultHomiToolRegistry,
} = require('../../backend/src/homi');

const {
  HOMI_TOOL_ARGUMENT_INVALID,
  HomiArgumentError,
  validateToolArguments,
} = require('../../backend/src/homiRuntime/argumentValidator');

const {
  HOMI_TOOL_BINDING_MISSING,
  TOOL_BINDINGS,
  createToolBindings,
  getToolBinding,
  listBoundToolIds,
} = require('../../backend/src/homiRuntime/toolBindings');

const {
  HOMI_TOOL_EXECUTION_FAILED,
  HOMI_TOOL_NOT_FOUND,
  HOMI_TOOL_NOT_READ,
  createHomiToolExecutor,
} = require('../../backend/src/homiRuntime/toolExecutor');

const {
  createPlannerReadHandlers,
} = require('../../backend/src/homiRuntime/tools/plannerReadHandlers');

const {
  createHomiObservability,
} = require('../../backend/src/homiRuntime/observability');

const {
  createTelemetry,
  createTelemetryCatalog,
  createTestTelemetrySink,
} = require('../../backend/src/lib/telemetry');

const { CORE_TELEMETRY_EVENTS } = require('../../backend/src/constants/coreTelemetryEvents');
const { HOMI_TELEMETRY_EVENTS } = require('../../backend/src/constants/homiTelemetryEvents');

const repositoryRoot = path.join(__dirname, '..', '..');
const runtimeDirectory = path.join(repositoryRoot, 'backend', 'src', 'homiRuntime');

const AUTH_USER_ID = 'auth-user-11111111';
const ACCESS_TOKEN = 'header.payload.signature-access-token-value';
const PERSON_ID = 'person-22222222';
const HOUSEHOLD_ID = 'household-33333333';
const MEMBERSHIP_ID = 'membership-44444444';
const ROLE = 'coordinator';

const TASK_ID = '11111111-1111-4111-8111-111111111111';
const EVENT_ID = '22222222-2222-4222-8222-222222222222';

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

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function buildCanonicalContext(overrides) {
  return Object.assign(
    {
      client: { marker: 'canonical-client-must-not-leak' },
      accountId: AUTH_USER_ID,
      person: { id: PERSON_ID, auth_user_id: AUTH_USER_ID },
      household: { id: HOUSEHOLD_ID, config: null },
      membership: {
        id: MEMBERSHIP_ID,
        household_id: HOUSEHOLD_ID,
        person_id: PERSON_ID,
        status: 'active',
        role: ROLE,
      },
      householdId: HOUSEHOLD_ID,
      personId: PERSON_ID,
      membershipId: MEMBERSHIP_ID,
      role: ROLE,
      membershipStatus: 'active',
    },
    overrides || {}
  );
}

function buildHomiContext() {
  return {
    actorId: PERSON_ID,
    householdId: HOUSEHOLD_ID,
    membershipId: MEMBERSHIP_ID,
    authUserId: AUTH_USER_ID,
    role: ROLE,
  };
}

/**
 * A canonical context resolver double. It records every call so the tests can
 * prove that the caller claims never reach it.
 */
function createContextResolverDouble(overrides) {
  const calls = [];
  const canonical = buildCanonicalContext(overrides);

  const resolveExecutionContext = async (input) => {
    calls.push(input);
    return { context: buildHomiContext(), canonical };
  };

  return { calls, canonical, resolveExecutionContext };
}

/**
 * An observability double that records the emitted events.
 */
function createObservabilityDouble() {
  const events = [];

  return {
    events,
    async started(input) {
      events.push({ name: 'homi.tool.started', ...input });
    },
    async succeeded(input) {
      events.push({ name: 'homi.tool.succeeded', ...input });
    },
    async failed(input) {
      events.push({ name: 'homi.tool.failed', ...input });
    },
  };
}

/**
 * A handler double that records its invocations.
 */
function createHandlerDouble(result) {
  const calls = [];

  const handler = async (context, args, execution) => {
    calls.push({ context, args, execution });
    return result ?? { tasks: [] };
  };

  return { calls, handler };
}

/**
 * A telemetry double backed by the canonical telemetry abstraction.
 */
function createTelemetryDouble() {
  const catalog = createTelemetryCatalog();
  catalog.register(CORE_TELEMETRY_EVENTS);
  catalog.register(HOMI_TELEMETRY_EVENTS);

  const sink = createTestTelemetrySink();
  const telemetry = createTelemetry({ catalog, sink });

  return { sink, telemetry, observability: createHomiObservability({ telemetry }) };
}

/**
 * Build an executor bound to doubles.
 */
function createExecutor(overrides) {
  const resolver = createContextResolverDouble();
  const observability = createObservabilityDouble();
  const spy = createHandlerDouble();

  const executor = createHomiToolExecutor(
    Object.assign(
      {
        resolveExecutionContext: resolver.resolveExecutionContext,
        observability,
        bindings: { 'planner.tasks.list': spy.handler },
      },
      overrides || {}
    )
  );

  return { executor, observability, resolver, spy };
}

function buildInvocation(overrides) {
  return Object.assign(
    {
      toolId: 'planner.tasks.list',
      claims: { actor_id: PERSON_ID, household_id: HOUSEHOLD_ID },
      args: {},
      user: { id: AUTH_USER_ID },
      accessToken: ACCESS_TOKEN,
      requestId: 'req-homi-0001',
    },
    overrides || {}
  );
}

async function assertRejectsWithCode(promise, expectedCode) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.code, expectedCode);
    return true;
  });
}

/**
 * Business service doubles. Every call is recorded with its exact arguments.
 */
function createServiceDoubles(overrides) {
  const calls = [];

  const record = (name, payload) => async (...args) => {
    calls.push({ name, args });
    return payload ?? { [name]: [] };
  };

  const services = {
    tasks: {
      listTasks: record('listTasks', { tasks: [] }),
      getTaskById: record('getTaskById', { task: { id: TASK_ID } }),
    },
    events: {
      listEvents: record('listEvents', { events: [] }),
      getEventById: record('getEventById', { event: { id: EVENT_ID } }),
    },
    calendar: {
      getCalendar: record('getCalendar', {
        view: 'day',
        date: '2026-03-04',
        range: { from: '2026-03-04T00:00:00.000Z', to: '2026-03-05T00:00:00.000Z' },
        items: [],
      }),
    },
    summary: {
      getSummary: record('getSummary', {
        household_id: HOUSEHOLD_ID,
        projection_version: 'planner.home_summary.v1',
        generated_at: '2026-03-04T10:00:00.000Z',
        counts: { tasks: 0, events: 0, goals: 0 },
        tasks: [],
        events: [],
        goal: null,
        partial_errors: [],
      }),
    },
    attention: {
      listAttention: record('listAttention', {
        projectionVersion: 'planner.global_attention.v1',
        context: 'active',
        generatedAt: '2026-03-04T10:00:00.000Z',
        limit: 50,
        total: 0,
        items: [],
      }),
    },
    search: {
      searchActive: record('searchActive', {
        projectionVersion: 'planner.global_active_search.v1',
        context: 'active',
        query: 'cocina',
        generatedAt: '2026-03-04T10:00:00.000Z',
        limit: 30,
        total: 0,
        groups: [],
      }),
    },
  };

  for (const key of Object.keys(overrides || {})) {
    services[key] = Object.assign({}, services[key], overrides[key]);
  }

  return { calls, services };
}

// ---------------------------------------------------------------------------
// 1..2: registry and binding parity
// ---------------------------------------------------------------------------

test('the registered production tools and the executable bindings are exactly equal', () => {
  const registry = createDefaultHomiToolRegistry();
  const registered = registry.list().map((tool) => tool.id).sort();
  const bound = listBoundToolIds();

  assert.deepEqual(registered, Array.from(REQUIRED_TOOL_IDS).sort());
  assert.deepEqual(bound, registered);
  assert.equal(registered.length, 8);
});

test('every registered tool has exactly one binding and every binding is registered', () => {
  const registry = createDefaultHomiToolRegistry();

  for (const toolId of REQUIRED_TOOL_IDS) {
    assert.equal(typeof getToolBinding(toolId), 'function', `${toolId} must be bound`);
    assert.ok(registry.has(toolId), `${toolId} must be registered`);
  }

  for (const toolId of listBoundToolIds()) {
    assert.ok(registry.has(toolId), `${toolId} must be a registered tool`);
  }
});

test('no binding exists for a tool that is not registered', () => {
  assert.equal(getToolBinding('planner.fake.whatever'), null);
  assert.equal(getToolBinding('planner.tasks.create'), null);
  assert.equal(getToolBinding(''), null);
  assert.equal(getToolBinding(undefined), null);
});

test('the binding map is a plain frozen map of tool id to handler', () => {
  assert.ok(Object.isFrozen(TOOL_BINDINGS));

  for (const toolId of Object.keys(TOOL_BINDINGS)) {
    assert.equal(typeof TOOL_BINDINGS[toolId], 'function');
  }
});

test('a binding that is not a function is rejected', () => {
  assert.throws(() => createToolBindings({ 'planner.tasks.list': 'nope' }), TypeError);
  assert.throws(() => createToolBindings(null), TypeError);
});

// ---------------------------------------------------------------------------
// 3..16: the executor
// ---------------------------------------------------------------------------

test('all eight default tools are executable through the Homi executor', async () => {
  const { calls } = createServiceDoubles();
  const bindings = createToolBindings(createPlannerReadHandlers(createServiceDoubles().services));
  const resolver = createContextResolverDouble();
  const observability = createObservabilityDouble();

  const executor = createHomiToolExecutor({
    resolveExecutionContext: resolver.resolveExecutionContext,
    bindings,
    observability,
  });

  const invocations = {
    'planner.tasks.list': {},
    'planner.tasks.get': { taskId: TASK_ID },
    'planner.events.list': {},
    'planner.events.get': { eventId: EVENT_ID },
    'planner.calendar.get': {},
    'planner.summary.get': {},
    'planner.attention.get': {},
    'planner.search.query': { query: 'cocina' },
  };

  for (const toolId of REQUIRED_TOOL_IDS) {
    const payload = await executor(
      buildInvocation({ toolId, args: invocations[toolId] })
    );

    assert.equal(payload.ok, true);
    assert.equal(payload.tool_id, toolId);
    assert.equal(typeof payload.result, 'object');
  }

  assert.equal(calls.length, 0);
});

test('an unknown tool is rejected before any business service executes', async () => {
  const { executor, spy } = createExecutor();

  await assertRejectsWithCode(
    executor(buildInvocation({ toolId: 'planner.fake.whatever' })),
    HOMI_TOOL_NOT_FOUND
  );

  assert.equal(spy.calls.length, 0);
});

test('an unknown tool is rejected with a deterministic status', async () => {
  const { executor } = createExecutor();

  await assert.rejects(executor(buildInvocation({ toolId: 'planner.fake.whatever' })), (error) => {
    assert.equal(error.code, HOMI_TOOL_NOT_FOUND);
    assert.equal(error.statusCode, 404);
    return true;
  });
});

test('a WRITE definition is rejected by the READ-only executor', async () => {
  const registry = createDefaultHomiToolRegistry();

  registry.register({
    contractVersion: '1.0.0',
    id: 'planner.synthetic.write',
    version: '1.0.0',
    domain: 'planner',
    description: 'Synthetic write tool used to prove the read-only executor gate.',
    kind: 'WRITE',
    riskFlags: ['LOW_MUTATION'],
    confirmation: 'NEVER',
    inputSchema: { type: 'object', additionalProperties: false, properties: {}, required: [] },
    outputSchema: { type: 'object' },
  });

  const spy = createHandlerDouble();
  const { executor } = createExecutor({
    registry,
    bindings: { 'planner.synthetic.write': spy.handler },
  });

  await assertRejectsWithCode(
    executor(buildInvocation({ toolId: 'planner.synthetic.write' })),
    HOMI_TOOL_NOT_READ
  );

  assert.equal(spy.calls.length, 0);
});

test('a registered tool without a binding is rejected', async () => {
  const { executor, spy } = createExecutor({ bindings: {} });

  await assertRejectsWithCode(executor(buildInvocation()), HOMI_TOOL_BINDING_MISSING);

  assert.equal(spy.calls.length, 0);
});

test('valid identity claims are accepted', async () => {
  const { executor, spy } = createExecutor();

  const payload = await executor(buildInvocation());

  assert.equal(payload.ok, true);
  assert.equal(payload.tool_id, 'planner.tasks.list');
  assert.equal(spy.calls.length, 1);
});

test('an actor mismatch blocks the execution', async () => {
  const { executor, spy } = createExecutor();

  await assertRejectsWithCode(
    executor(
      buildInvocation({
        claims: { actor_id: 'someone-else', household_id: HOUSEHOLD_ID },
      })
    ),
    HOMI_CONTEXT_MISMATCH
  );

  assert.equal(spy.calls.length, 0);
});

test('a household mismatch blocks the execution', async () => {
  const { executor, spy } = createExecutor();

  await assertRejectsWithCode(
    executor(
      buildInvocation({
        claims: { actor_id: PERSON_ID, household_id: 'another-household' },
      })
    ),
    HOMI_CONTEXT_MISMATCH
  );

  assert.equal(spy.calls.length, 0);
});

test('a missing identity claim is rejected', async () => {
  const { executor, spy } = createExecutor();

  await assertRejectsWithCode(
    executor(buildInvocation({ claims: { household_id: HOUSEHOLD_ID } })),
    HOMI_CLAIM_INVALID
  );

  assert.equal(spy.calls.length, 0);
});

test('a missing authenticated authority is rejected', async () => {
  const { executor, spy } = createExecutor();

  await assertRejectsWithCode(
    executor(buildInvocation({ accessToken: undefined })),
    HOMI_AUTH_CONTEXT_INVALID
  );

  assert.equal(spy.calls.length, 0);
});

test('invalid arguments block the execution before the handler runs', async () => {
  const spy = createHandlerDouble();
  const { executor } = createExecutor({
    bindings: { 'planner.tasks.get': spy.handler },
  });

  await assertRejectsWithCode(
    executor(buildInvocation({ toolId: 'planner.tasks.get', args: {} })),
    HOMI_TOOL_ARGUMENT_INVALID
  );

  assert.equal(spy.calls.length, 0);
});

test('the request id is propagated to the handler', async () => {
  const { executor, spy } = createExecutor();

  await executor(buildInvocation({ requestId: 'req-homi-4242' }));

  assert.equal(spy.calls.length, 1);
  assert.equal(spy.calls[0].execution.requestId, 'req-homi-4242');
});

test('the successful result is returned unchanged', async () => {
  const payload = { tasks: [{ id: TASK_ID, title: 'Limpiar' }] };
  const { executor } = createExecutor({
    bindings: { 'planner.tasks.list': async () => payload },
  });

  const result = await executor(buildInvocation());

  assert.deepEqual(result, {
    ok: true,
    tool_id: 'planner.tasks.list',
    result: payload,
  });
});

test('a business service error is never converted into a success', async () => {
  const canonicalError = Object.assign(new Error('Tarea no encontrada.'), {
    statusCode: 404,
    code: 'task_not_found',
  });

  const { executor } = createExecutor({
    bindings: {
      'planner.tasks.list': async () => {
        throw canonicalError;
      },
    },
  });

  await assert.rejects(executor(buildInvocation()), (error) => {
    assert.equal(error.code, 'task_not_found');
    assert.equal(error.statusCode, 404);
    return true;
  });
});

test('an unexpected failure becomes an opaque internal error', async () => {
  const { executor } = createExecutor({
    bindings: {
      'planner.tasks.list': async () => {
        throw new Error(`boom ${ACCESS_TOKEN}`);
      },
    },
  });

  await assert.rejects(executor(buildInvocation()), (error) => {
    assert.equal(error.code, HOMI_TOOL_EXECUTION_FAILED);
    assert.equal(error.statusCode, 500);
    return true;
  });
});

test('the access token never leaks into an error', async () => {
  const { executor } = createExecutor({
    bindings: {
      'planner.tasks.list': async () => {
        throw new Error(`boom ${ACCESS_TOKEN}`);
      },
    },
  });

  await assert.rejects(executor(buildInvocation()), (error) => {
    assert.ok(!String(error.message).includes(ACCESS_TOKEN));
    assert.ok(!JSON.stringify(error.details || {}).includes(ACCESS_TOKEN));
    assert.ok(!JSON.stringify(error).includes(ACCESS_TOKEN));
    return true;
  });
});

test('the access token never reaches the observability events', async () => {
  const { sink, telemetry, observability } = createTelemetryDouble();
  const { executor } = createExecutor({
    observability,
    bindings: {
      'planner.tasks.list': async () => {
        throw new Error(`boom ${ACCESS_TOKEN}`);
      },
    },
  });

  await assert.rejects(executor(buildInvocation()));

  const serialized = JSON.stringify(sink.events);
  assert.ok(!serialized.includes(ACCESS_TOKEN));
  assert.ok(!serialized.includes('boom'));
});

test('the canonical context resolver never receives the caller claims', async () => {
  const { executor, resolver } = createExecutor();

  await executor(
    buildInvocation({
      claims: { actor_id: PERSON_ID, household_id: HOUSEHOLD_ID },
    })
  );

  assert.equal(resolver.calls.length, 1);
  assert.deepEqual(Object.keys(resolver.calls[0]).sort(), ['accessToken', 'user']);
  assert.equal(resolver.calls[0].accessToken, ACCESS_TOKEN);
  assert.equal(resolver.calls[0].user.id, AUTH_USER_ID);
});

test('the caller claims never become the service authority', async () => {
  const { services, calls } = createServiceDoubles();
  const bindings = createToolBindings(createPlannerReadHandlers(services));
  const resolver = createContextResolverDouble();

  const executor = createHomiToolExecutor({
    resolveExecutionContext: resolver.resolveExecutionContext,
    bindings,
    observability: createObservabilityDouble(),
  });

  await executor(buildInvocation({ toolId: 'planner.tasks.list', args: {} }));

  const call = calls.find((entry) => entry.name === 'listTasks');
  assert.ok(call);
  assert.equal(call.args[0].householdId, HOUSEHOLD_ID);
  assert.equal(call.args[0].personId, PERSON_ID);
  assert.notEqual(call.args[0].householdId, 'someone-else');
});

// ---------------------------------------------------------------------------
// 17..25: runtime argument validation
// ---------------------------------------------------------------------------

test('a required field is enforced', () => {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: { taskId: { type: 'string', minLength: 1 } },
    required: ['taskId'],
  };

  assert.throws(() => validateToolArguments(schema, {}), (error) => {
    assert.ok(error instanceof HomiArgumentError);
    assert.equal(error.code, HOMI_TOOL_ARGUMENT_INVALID);
    assert.equal(error.details.field, 'taskId');
    return true;
  });

  assert.doesNotThrow(() => validateToolArguments(schema, { taskId: TASK_ID }));
});

test('an unknown argument is rejected', () => {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {},
    required: [],
  };

  assert.throws(() => validateToolArguments(schema, { foo: 'bar' }), (error) => {
    assert.equal(error.code, HOMI_TOOL_ARGUMENT_INVALID);
    assert.equal(error.details.reason, 'unknown_argument');
    assert.equal(error.details.field, 'foo');
    return true;
  });
});

test('a non object argument payload is rejected', () => {
  const schema = { type: 'object', additionalProperties: false, properties: {}, required: [] };

  for (const value of [undefined, null, 'text', 42, []]) {
    assert.throws(() => validateToolArguments(schema, value), (error) => {
      assert.equal(error.code, HOMI_TOOL_ARGUMENT_INVALID);
      return true;
    });
  }
});

test('a string argument is validated', () => {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: { query: { type: 'string', minLength: 1 } },
    required: ['query'],
  };

  assert.throws(() => validateToolArguments(schema, { query: '' }), (error) => {
    assert.equal(error.details.reason, 'too_short');
    return true;
  });

  assert.throws(() => validateToolArguments(schema, { query: 42 }), (error) => {
    assert.equal(error.details.reason, 'invalid_type');
    return true;
  });
});

test('an integer argument is validated without coercion', () => {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: { limit: { type: 'integer', minimum: 1, maximum: 100 } },
    required: [],
  };

  assert.throws(() => validateToolArguments(schema, { limit: '10' }), (error) => {
    assert.equal(error.details.reason, 'invalid_type');
    return true;
  });

  assert.throws(() => validateToolArguments(schema, { limit: 10.5 }), (error) => {
    assert.equal(error.details.reason, 'invalid_type');
    return true;
  });

  assert.throws(() => validateToolArguments(schema, { limit: Number.NaN }), (error) => {
    assert.equal(error.details.reason, 'invalid_type');
    return true;
  });

  assert.deepEqual(validateToolArguments(schema, { limit: 10 }), { limit: 10 });
});

test('a boolean argument is validated without coercion', () => {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: { includeCancelled: { type: 'boolean' } },
    required: [],
  };

  for (const value of ['true', 'false', 1, 0, null, {}]) {
    assert.throws(() => validateToolArguments(schema, { includeCancelled: value }), (error) => {
      assert.equal(error.details.reason, 'invalid_type');
      return true;
    });
  }

  assert.deepEqual(validateToolArguments(schema, { includeCancelled: false }), {
    includeCancelled: false,
  });
});

test('an enum argument is validated', () => {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: { status: { type: 'string', enum: ['pending', 'completed'] } },
    required: [],
  };

  assert.throws(() => validateToolArguments(schema, { status: 'archived' }), (error) => {
    assert.equal(error.details.reason, 'invalid_enum');
    return true;
  });

  assert.deepEqual(validateToolArguments(schema, { status: 'pending' }), { status: 'pending' });
});

test('the numeric bounds are validated', () => {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: { limit: { type: 'integer', minimum: 1, maximum: 50 } },
    required: [],
  };

  assert.throws(() => validateToolArguments(schema, { limit: 0 }), (error) => {
    assert.equal(error.details.reason, 'below_minimum');
    return true;
  });

  assert.throws(() => validateToolArguments(schema, { limit: 51 }), (error) => {
    assert.equal(error.details.reason, 'above_maximum');
    return true;
  });
});

test('the date pattern is validated', () => {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: { from: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' } },
    required: [],
  };

  assert.throws(() => validateToolArguments(schema, { from: '04/03/2026' }), (error) => {
    assert.equal(error.details.reason, 'pattern_mismatch');
    return true;
  });

  assert.deepEqual(validateToolArguments(schema, { from: '2026-03-04' }), { from: '2026-03-04' });
});

test('no value is ever silently coerced', () => {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      limit: { type: 'integer', minimum: 1, maximum: 100 },
      includeArchived: { type: 'boolean' },
      query: { type: 'string', minLength: 1 },
    },
    required: [],
  };

  assert.throws(() => validateToolArguments(schema, { limit: '10' }));
  assert.throws(() => validateToolArguments(schema, { includeArchived: 'true' }));
  assert.throws(() => validateToolArguments(schema, { includeArchived: 1 }));
  assert.throws(() => validateToolArguments(schema, { query: 42 }));
  assert.throws(() => validateToolArguments(schema, { query: ['a'] }));
});

test('the validated arguments are frozen', () => {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: { limit: { type: 'integer' } },
    required: [],
  };

  const validated = validateToolArguments(schema, { limit: 5 });

  assert.ok(Object.isFrozen(validated));
  assert.throws(() => {
    validated.limit = 9;
  }, TypeError);
});

test('an unsupported schema construct fails closed', () => {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: { nested: { type: 'object', properties: {} } },
    required: [],
  };

  assert.throws(() => validateToolArguments(schema, { nested: {} }), (error) => {
    assert.equal(error.details.reason, 'unsupported_schema');
    return true;
  });
});

test('the rejected value never appears in the error', () => {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: { query: { type: 'string', pattern: '^ok$' } },
    required: [],
  };

  assert.throws(() => validateToolArguments(schema, { query: 'secret-value' }), (error) => {
    assert.ok(!String(error.message).includes('secret-value'));
    assert.ok(!JSON.stringify(error.details).includes('secret-value'));
    return true;
  });
});

// ---------------------------------------------------------------------------
// 26..33: the eight Planner READ adapters
// ---------------------------------------------------------------------------

test('the task list adapter maps the canonical arguments onto the task listing read', async () => {
  const { calls, services } = createServiceDoubles();
  const handlers = createPlannerReadHandlers(services);

  await handlers['planner.tasks.list'](buildCanonicalContext(), {
    status: 'pending',
    includeCancelled: true,
    includeArchived: false,
    from: '2026-03-01',
    to: '2026-03-31',
    limit: 10,
  });

  const call = calls.find((entry) => entry.name === 'listTasks');
  assert.ok(call);
  assert.deepEqual(call.args[1], {
    status: 'pending',
    from: '2026-03-01',
    to: '2026-03-31',
    limit: 10,
    include_cancelled: true,
    include_archived: false,
  });

  const query = call.args[1];
  assert.equal(query.assigned_to_member_id, undefined);
  assert.equal(query.goal_id, undefined);
  assert.equal(query.template_key, undefined);
});

test('the task list adapter keeps an absent filter absent', async () => {
  const { calls, services } = createServiceDoubles();
  const handlers = createPlannerReadHandlers(services);

  await handlers['planner.tasks.list'](buildCanonicalContext(), {});

  const call = calls.find((entry) => entry.name === 'listTasks');
  assert.deepEqual(call.args[1], {});
});

test('the task read adapter calls the canonical task read authority', async () => {
  const { calls, services } = createServiceDoubles();
  const handlers = createPlannerReadHandlers(services);

  const payload = await handlers['planner.tasks.get'](buildCanonicalContext(), {
    taskId: TASK_ID,
  });

  const call = calls.find((entry) => entry.name === 'getTaskById');
  assert.ok(call);
  assert.equal(call.args[0].householdId, HOUSEHOLD_ID);
  assert.equal(call.args[1], TASK_ID);
  assert.deepEqual(payload, { task: { id: TASK_ID } });
});

test('the task read adapter keeps the canonical not found outcome for a malformed id', async () => {
  const { calls, services } = createServiceDoubles();
  const handlers = createPlannerReadHandlers(services);

  await assert.rejects(
    handlers['planner.tasks.get'](buildCanonicalContext(), { taskId: 'not-a-uuid' }),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.code, 'task_not_found');
      return true;
    }
  );

  assert.equal(calls.length, 0);
});

test('the event list adapter maps the canonical arguments onto the event listing read', async () => {
  const { calls, services } = createServiceDoubles();
  const handlers = createPlannerReadHandlers(services);

  await handlers['planner.events.list'](buildCanonicalContext(), {
    from: '2026-03-01T00:00:00.000Z',
    to: '2026-03-31T00:00:00.000Z',
    status: 'scheduled',
    includeCancelled: false,
    includeRecurring: true,
  });

  const call = calls.find((entry) => entry.name === 'listEvents');
  assert.ok(call);
  assert.deepEqual(call.args[1], {
    from: '2026-03-01T00:00:00.000Z',
    to: '2026-03-31T00:00:00.000Z',
    status: 'scheduled',
    include_cancelled: false,
    include_recurring: true,
  });
});

test('the event read adapter calls the canonical event read authority', async () => {
  const { calls, services } = createServiceDoubles();
  const handlers = createPlannerReadHandlers(services);

  const payload = await handlers['planner.events.get'](buildCanonicalContext(), {
    eventId: EVENT_ID,
  });

  const call = calls.find((entry) => entry.name === 'getEventById');
  assert.ok(call);
  assert.equal(call.args[0].householdId, HOUSEHOLD_ID);
  assert.equal(call.args[1], EVENT_ID);
  assert.deepEqual(payload, { event: { id: EVENT_ID } });
});

test('the calendar adapter maps the view and the reference date onto the calendar read', async () => {
  const { calls, services } = createServiceDoubles();
  const handlers = createPlannerReadHandlers(services);

  await handlers['planner.calendar.get'](buildCanonicalContext(), {
    view: 'week',
    date: '2026-03-04',
  });

  const call = calls.find((entry) => entry.name === 'getCalendar');
  assert.ok(call);
  assert.deepEqual(call.args[1], { view: 'week', date: '2026-03-04' });
});

test('the calendar adapter keeps the current defaults by omitting an absent argument', async () => {
  const { calls, services } = createServiceDoubles();
  const handlers = createPlannerReadHandlers(services);

  await handlers['planner.calendar.get'](buildCanonicalContext(), {});

  const call = calls.find((entry) => entry.name === 'getCalendar');
  assert.deepEqual(call.args[1], {});
});

test('the summary adapter calls the canonical summary read with the request correlation', async () => {
  const { calls, services } = createServiceDoubles();
  const handlers = createPlannerReadHandlers(services);

  await handlers['planner.summary.get'](
    buildCanonicalContext(),
    {},
    { requestId: 'req-homi-9999' }
  );

  const call = calls.find((entry) => entry.name === 'getSummary');
  assert.ok(call);
  assert.deepEqual(call.args[1], { requestId: 'req-homi-9999' });
});

test('the attention adapter maps the limit onto the attention read', async () => {
  const { calls, services } = createServiceDoubles();
  const handlers = createPlannerReadHandlers(services);

  await handlers['planner.attention.get'](buildCanonicalContext(), { limit: 25 });

  const call = calls.find((entry) => entry.name === 'listAttention');
  assert.ok(call);
  assert.deepEqual(call.args[1], { limit: 25 });
});

test('the search adapter maps the tool query onto the canonical transport field', async () => {
  const { calls, services } = createServiceDoubles();
  const handlers = createPlannerReadHandlers(services);

  await handlers['planner.search.query'](buildCanonicalContext(), {
    query: 'cocina',
    limit: 20,
  });

  const call = calls.find((entry) => entry.name === 'searchActive');
  assert.ok(call);
  assert.equal(call.args[1].query, 'cocina');
  assert.equal(call.args[1].limit, 20);
  assert.equal(call.args[1].context, undefined);
});

// ---------------------------------------------------------------------------
// 34..39: security boundary
// ---------------------------------------------------------------------------

function listRuntimeSources(directory = runtimeDirectory, prefix = '') {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativeName = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      files.push(...listRuntimeSources(path.join(directory, entry.name), relativeName));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(relativeName);
    }
  }

  return files.sort();
}

/**
 * Read a runtime source without its comments, so a prose sentence can never
 * be mistaken for an embedded statement.
 */
function readRuntimeCode(relativeName) {
  const source = fs.readFileSync(path.join(runtimeDirectory, relativeName), 'utf8');

  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

test('the Homi runtime modules use no data client and no remote procedure', () => {
  for (const relativeName of listRuntimeSources()) {
    const source = readRuntimeCode(relativeName);

    assert.doesNotMatch(source, /supabase/i, `${relativeName} must not use a data client`);
    assert.doesNotMatch(source, /\.rpc\s*\(/, `${relativeName} must not invoke a remote procedure`);
    assert.doesNotMatch(source, /\bcreateClient\b/, `${relativeName} must not build a data client`);
  }
});

test('the Homi runtime modules embed no SQL', () => {
  for (const relativeName of listRuntimeSources()) {
    const source = readRuntimeCode(relativeName);

    assert.doesNotMatch(source, /\bselect\b[\s\S]*\bfrom\b/i, `${relativeName} must not embed SQL`);
    assert.doesNotMatch(source, /\binsert\s+into\b/i, `${relativeName} must not embed SQL`);
    assert.doesNotMatch(source, /\bdelete\s+from\b/i, `${relativeName} must not embed SQL`);
    assert.doesNotMatch(source, /\bupdate\b[\s\S]*\bset\b/i, `${relativeName} must not embed SQL`);
  }
});

test('the Homi runtime modules perform no internal HTTP call', () => {
  for (const relativeName of listRuntimeSources()) {
    const source = readRuntimeCode(relativeName);

    assert.doesNotMatch(source, /\b(fetch|XMLHttpRequest)\b/, `${relativeName} must not call the network`);
    assert.doesNotMatch(source, /\baxios\b/, `${relativeName} must not call the network`);
    assert.doesNotMatch(source, /http\.request|https\.request/, `${relativeName} must not call the network`);
    assert.doesNotMatch(source, /localhost/, `${relativeName} must not call an internal endpoint`);
    assert.doesNotMatch(source, /\/api\/planner/, `${relativeName} must not call the planner routes`);
  }
});

test('the Homi runtime modules never load a module from a caller supplied path', () => {
  for (const relativeName of listRuntimeSources()) {
    const source = readRuntimeCode(relativeName);

    assert.doesNotMatch(source, /\beval\s*\(/, `${relativeName} must not evaluate code`);
    assert.doesNotMatch(source, /new\s+Function\s*\(/, `${relativeName} must not evaluate code`);
    assert.doesNotMatch(
      source,
      /require\s*\(\s*[a-zA-Z_$][\w$]*\s*\)/,
      `${relativeName} must not require a dynamic path`
    );
  }
});

test('the business services are resolved lazily, never at import time', () => {
  const runtimeEntry = path.join(repositoryRoot, 'backend', 'src', 'homiRuntime').replace(/\\/g, '/');
  const script = [
    `require('${runtimeEntry}');`,
    "const loaded = Object.keys(require.cache)",
    "  .map((key) => key.replace(/\\\\/g, '/'))",
    "  .filter((key) => key.includes('/services/planner.'));",
    'process.stdout.write(JSON.stringify(loaded));',
  ].join('\n');

  const result = spawnSync(process.execPath, ['-e', script], {
    encoding: 'utf8',
    windowsHide: true,
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), []);
});

test('no WRITE tool is bound and every bound tool is a READ tool', () => {
  const registry = createDefaultHomiToolRegistry();

  for (const toolId of listBoundToolIds()) {
    const definition = registry.get(toolId);

    assert.ok(definition, `${toolId} must be registered`);
    assert.equal(definition.kind, 'READ');
    assert.equal(definition.confirmation, 'NEVER');
    assert.deepEqual(Array.from(definition.riskFlags), ['READ_ONLY']);
  }
});

test('the tool definitions carry no handler and no execution entry point', () => {
  const registry = createDefaultHomiToolRegistry();

  for (const definition of registry.list()) {
    for (const field of ['handler', 'execute', 'service', 'controller', 'route']) {
      assert.equal(definition[field], undefined, `${definition.id} must not declare "${field}"`);
    }
  }
});

// ---------------------------------------------------------------------------
// 40..45: observability
// ---------------------------------------------------------------------------

test('a started event is emitted for every attempted execution', async () => {
  const { executor, observability } = createExecutor();

  await executor(buildInvocation());

  assert.equal(observability.events.length, 2);
  assert.equal(observability.events[0].name, 'homi.tool.started');
  assert.equal(observability.events[0].toolId, 'planner.tasks.list');
});

test('a succeeded event is emitted with the authoritative identity', async () => {
  const { executor, observability } = createExecutor();

  await executor(buildInvocation());

  const succeeded = observability.events.find((event) => event.name === 'homi.tool.succeeded');
  assert.ok(succeeded);
  assert.equal(succeeded.actorId, PERSON_ID);
  assert.equal(succeeded.householdId, HOUSEHOLD_ID);
  assert.ok(succeeded.durationMs >= 0);
});

test('a failed event is emitted with the error code', async () => {
  const { executor, observability } = createExecutor();

  await assertRejectsWithCode(
    executor(buildInvocation({ toolId: 'planner.fake.whatever' })),
    HOMI_TOOL_NOT_FOUND
  );

  const failed = observability.events.find((event) => event.name === 'homi.tool.failed');
  assert.ok(failed);
  assert.equal(failed.errorCode, HOMI_TOOL_NOT_FOUND);
  assert.ok(failed.durationMs >= 0);
});

test('the request id is consistent across the execution and the observability', async () => {
  const { sink, telemetry, observability } = createTelemetryDouble();
  const { executor } = createExecutor({ observability });

  await executor(buildInvocation({ requestId: 'req-homi-7777' }));

  assert.equal(sink.events.length, 2);

  for (const event of sink.events) {
    assert.equal(event.correlation.request_id, 'req-homi-7777');
    assert.ok(Number.isFinite(event.properties.duration_ms));
    assert.ok(event.properties.duration_ms >= 0);
  }
});

test('the emitted telemetry carries only safe metadata', async () => {
  const { sink, telemetry, observability } = createTelemetryDouble();
  const { executor } = createExecutor({ observability });

  await executor(
    buildInvocation({
      toolId: 'planner.tasks.list',
      args: { status: 'pending' },
    })
  );

  for (const event of sink.events) {
    assert.equal(event.event_name.startsWith('homi.tool.'), true);
    assert.equal(event.domain, 'homi');
    assert.deepEqual(
      Object.keys(event.properties).sort().filter(
        (key) => !['tool_id', 'actor_id', 'household_id', 'duration_ms', 'outcome', 'error_code'].includes(key)
      ),
      []
    );
    assert.ok(!JSON.stringify(event).includes('pending'));
  }
});

test('the telemetry catalog declares the three tool execution events', () => {
  const names = HOMI_TELEMETRY_EVENTS.map((definition) => definition.name).sort();

  assert.deepEqual(names, [
    'homi.tool.failed',
    'homi.tool.started',
    'homi.tool.succeeded',
  ]);

  for (const definition of HOMI_TELEMETRY_EVENTS) {
    assert.equal(definition.domain, 'homi');
  }
});

test('a telemetry failure never breaks a tool execution', async () => {
  const brokenObservability = {
    async started() {
      throw new Error('telemetry is down');
    },
    async succeeded() {
      throw new Error('telemetry is down');
    },
    async failed() {
      throw new Error('telemetry is down');
    },
  };

  const { executor } = createExecutor({ observability: brokenObservability });

  const payload = await executor(buildInvocation());

  assert.equal(payload.ok, true);
});
