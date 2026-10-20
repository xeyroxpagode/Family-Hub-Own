'use strict';

/**
 * HomePlus Homi Tool Layer — security / adversarial / regression freeze
 * (T07-S5).
 *
 * This file is the final gate of the Homi Tool Layer V1. It proves, with
 * deterministic doubles and static evidence, that the eight production
 * Planner READ tools cannot:
 *
 *   - impersonate another actor;
 *   - switch household;
 *   - bypass the existing Planner authorization;
 *   - execute WRITE behavior;
 *   - accept malformed or unexpected arguments;
 *   - leak secrets;
 *   - execute an unknown or unbound tool;
 *   - cross household boundaries;
 *   - mutate HomePlus;
 *   - break the frozen registry/binding contract.
 *
 * It also freezes the error taxonomy, the request correlation, the
 * observability failure isolation and the authorization parity between the
 * Homi surface and the current canonical Planner controllers.
 *
 * No live database and no backend runtime dependency is required: the
 * canonical context authority, the canonical Planner services and the
 * canonical Planner controllers are injected as deterministic doubles, exactly
 * like the production modules accept them.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  HOMI_AUTH_CONTEXT_INVALID,
  HOMI_CLAIM_INVALID,
  HOMI_CONTEXT_MISMATCH,
  HOMI_CONTEXT_UNAVAILABLE,
  createDefaultHomiToolRegistry,
} = require('../../backend/src/homi');

const {
  HOMI_ERROR_STATUS,
  HOMI_TOOL_ARGUMENT_INVALID,
  HOMI_TOOL_BINDING_MISSING,
  HOMI_TOOL_EXECUTION_FAILED,
  HOMI_TOOL_NOT_FOUND,
  HOMI_TOOL_NOT_READ,
  TOOL_BINDINGS,
  createHomiObservability,
  createHomiToolExecutor,
  createPlannerReadHandlers,
  createToolBindings,
  listBoundToolIds,
} = require('../../backend/src/homiRuntime');

const {
  EVENT_NOT_FOUND,
  TASK_NOT_FOUND,
} = require('../../backend/src/homiRuntime/tools/plannerReadHandlers');

const {
  createTelemetry,
  createTelemetryCatalog,
  createTestTelemetrySink,
} = require('../../backend/src/lib/telemetry');

const { CORE_TELEMETRY_EVENTS } = require('../../backend/src/constants/coreTelemetryEvents');
const { HOMI_TELEMETRY_EVENTS } = require('../../backend/src/constants/homiTelemetryEvents');
const { errorEnvelopeMiddleware } = require('../../backend/src/middleware/errorEnvelopeMiddleware');

const repositoryRoot = path.join(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const AUTH_USER_ID = 'auth-user-11111111';
const ACCESS_TOKEN = 'header.payload.signature-freeze-access-token';
const SECRET_MARKER = 'freeze-secret-marker-do-not-leak';

const PERSON_A = 'person-a-11111111';
const PERSON_B = 'person-b-22222222';
const HOUSEHOLD_H1 = 'household-h1-33333333';
const HOUSEHOLD_H2 = 'household-h2-44444444';
const MEMBERSHIP_M1 = 'membership-m1-55555555';
const MEMBERSHIP_H2 = 'membership-h2-66666666';

const ROLE = 'coordinator';

const TASK_ID = '11111111-1111-4111-8111-111111111111';
const FOREIGN_TASK_ID = '99999999-9999-4999-8999-999999999999';
const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const FOREIGN_EVENT_ID = '88888888-8888-4888-8888-888888888888';

const CANONICAL_TOOL_IDS = Object.freeze([
  'planner.attention.get',
  'planner.calendar.get',
  'planner.events.get',
  'planner.events.list',
  'planner.search.query',
  'planner.summary.get',
  'planner.tasks.get',
  'planner.tasks.list',
]);

const VALID_ARGS = Object.freeze({
  'planner.tasks.list': {},
  'planner.tasks.get': { taskId: TASK_ID },
  'planner.events.list': {},
  'planner.events.get': { eventId: EVENT_ID },
  'planner.calendar.get': {},
  'planner.summary.get': {},
  'planner.attention.get': {},
  'planner.search.query': { query: 'cocina' },
});

/**
 * The only Planner service authorities the Homi READ layer is allowed to
 * call. Every other Planner method is a mutation or is out of scope.
 */
const ALLOWED_SERVICE_CALLS = Object.freeze([
  'getCalendar',
  'getEventById',
  'getSummary',
  'getTaskById',
  'listAttention',
  'listEvents',
  'listTasks',
  'searchActive',
]);

const H1_TASKS = [{ id: TASK_ID, title: 'Limpiar la cocina', household_id: HOUSEHOLD_H1 }];
const H2_TASKS = [{ id: FOREIGN_TASK_ID, title: 'Tarea privada de H2', household_id: HOUSEHOLD_H2 }];
const H1_EVENTS = [
  { id: EVENT_ID, title: 'Cena familiar', household_id: HOUSEHOLD_H1, starts_at: '2026-03-04T20:00:00.000Z' },
];
const H2_EVENTS = [
  { id: FOREIGN_EVENT_ID, title: 'Evento privado de H2', household_id: HOUSEHOLD_H2, starts_at: '2026-03-04T21:00:00.000Z' },
];

/**
 * Build the canonical HomePlus context of the authoritative actor.
 *
 * @param {object} [overrides] field overrides
 * @returns {object} the canonical context
 */
function buildCanonicalContext(overrides) {
  return Object.assign(
    {
      client: { marker: 'canonical-client-must-not-leak' },
      accountId: AUTH_USER_ID,
      person: { id: PERSON_A, auth_user_id: AUTH_USER_ID },
      household: { id: HOUSEHOLD_H1, config: null },
      membership: {
        id: MEMBERSHIP_M1,
        household_id: HOUSEHOLD_H1,
        person_id: PERSON_A,
        status: 'active',
        role: ROLE,
      },
      householdId: HOUSEHOLD_H1,
      personId: PERSON_A,
      membershipId: MEMBERSHIP_M1,
      role: ROLE,
      membershipStatus: 'active',
    },
    overrides || {}
  );
}

/**
 * Build the normalized Homi context of the authoritative actor.
 */
function buildHomiContext(overrides) {
  return Object.assign(
    {
      actorId: PERSON_A,
      householdId: HOUSEHOLD_H1,
      membershipId: MEMBERSHIP_M1,
      authUserId: AUTH_USER_ID,
      role: ROLE,
    },
    overrides || {}
  );
}

/**
 * The deterministic Planner service doubles.
 *
 * They reproduce the current canonical Planner service semantics that matter
 * for this gate:
 *   - every read is scoped by `context.householdId` (the authoritative
 *     household, never a caller supplied one);
 *   - a row of another household is invisible: a single row read collapses
 *     into the canonical not-found outcome and a list read collapses into an
 *     empty/foreign-free result;
 *   - no read ever mutates anything.
 */
function createServiceDoubles(overrides) {
  const calls = [];

  const record = (name, implementation) => async (...args) => {
    calls.push({ name, args });
    return implementation(...args);
  };

  const ownTasks = (context) => (context?.householdId === HOUSEHOLD_H2 ? H2_TASKS : H1_TASKS);
  const ownEvents = (context) => (context?.householdId === HOUSEHOLD_H2 ? H2_EVENTS : H1_EVENTS);

  const services = {
    tasks: {
      listTasks: record('listTasks', (context, query) => {
        const tasks = ownTasks(context).filter((task) => {
          if (query?.status && task.status !== query.status) return false;
          return true;
        });
        return { tasks };
      }),
      getTaskById: record('getTaskById', (context, taskId) => {
        const task = ownTasks(context).find((candidate) => candidate.id === taskId);
        if (!task) {
          const error = new Error('Tarea no encontrada.');
          error.statusCode = 404;
          error.code = 'task_not_found';
          throw error;
        }
        return { task };
      }),
    },
    events: {
      listEvents: record('listEvents', (context) => ({ events: ownEvents(context) })),
      getEventById: record('getEventById', (context, eventId) => {
        const event = ownEvents(context).find((candidate) => candidate.id === eventId);
        if (!event) {
          const error = new Error('Evento no encontrado.');
          error.statusCode = 404;
          error.code = 'event_not_found';
          throw error;
        }
        return { event };
      }),
    },
    calendar: {
      getCalendar: record('getCalendar', (context, query) => ({
        view: query?.view ?? 'day',
        date: query?.date ?? '2026-03-04',
        range: { from: '2026-03-04T00:00:00.000Z', to: '2026-03-05T00:00:00.000Z' },
        items: ownEvents(context).map((event) => ({
          type: 'event',
          id: event.id,
          title: event.title,
          starts_at: event.starts_at,
        })),
      })),
    },
    summary: {
      getSummary: record('getSummary', (context) => ({
        household_id: context?.householdId ?? null,
        projection_version: 'planner.home_summary.v1',
        generated_at: '2026-03-04T10:00:00.000Z',
        counts: { tasks: 1, events: 1, goals: 0 },
        tasks: ownTasks(context),
        events: ownEvents(context),
        goal: null,
        partial_errors: [],
      })),
    },
    attention: {
      listAttention: record('listAttention', (context) => ({
        projectionVersion: 'planner.global_attention.v1',
        context: 'active',
        generatedAt: '2026-03-04T10:00:00.000Z',
        limit: 50,
        total: 1,
        items: [
          {
            attentionId: 'attention-h1',
            entityType: 'task',
            entityId: ownTasks(context)[0]?.id ?? null,
            reason: 'awaiting_verification',
          },
        ],
      })),
    },
    search: {
      searchActive: record('searchActive', (context, options) => ({
        projectionVersion: 'planner.global_active_search.v1',
        context: 'active',
        query: options?.query ?? '',
        generatedAt: '2026-03-04T10:00:00.000Z',
        limit: options?.limit ?? 30,
        total: 1,
        groups: [
          { entityType: 'task', label: 'Tareas', results: ownTasks(context) },
          { entityType: 'event', label: 'Eventos', results: ownEvents(context) },
        ],
      })),
    },
  };

  for (const key of Object.keys(overrides || {})) {
    services[key] = Object.assign({}, services[key], overrides[key]);
  }

  return { calls, services };
}

/**
 * A canonical context resolver double. It records every call so the tests can
 * prove that the caller claims never reach the authoritative boundary.
 */
function createContextResolverDouble(overrides) {
  const calls = [];
  const canonical = buildCanonicalContext(overrides?.canonical);

  const resolveExecutionContext = async (input) => {
    calls.push(input);
    const context = overrides?.context ?? buildHomiContext();
    return { context, canonical };
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
 * Build an executor bound to doubles.
 */
function createExecutor(options) {
  const resolver = options?.resolver ?? createContextResolverDouble();
  const observability = options?.observability ?? createObservabilityDouble();
  const { calls, services } = options?.doubles ?? createServiceDoubles();

  const bindings = options?.bindings ?? createToolBindings(createPlannerReadHandlers(services));

  const executor = createHomiToolExecutor({
    registry: options?.registry,
    resolveExecutionContext: resolver.resolveExecutionContext,
    observability,
    bindings,
  });

  return { executor, observability, resolver, services, calls, bindings };
}

function buildInvocation(overrides) {
  return Object.assign(
    {
      toolId: 'planner.tasks.list',
      claims: { actor_id: PERSON_A, household_id: HOUSEHOLD_H1 },
      args: {},
      user: { id: AUTH_USER_ID },
      accessToken: ACCESS_TOKEN,
      requestId: 'req-homi-freeze-1',
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
 * Inject deterministic module doubles into the module cache and restore the
 * previous state afterwards.
 *
 * @param {object} stubs map of resolved module path to exported double
 * @param {Function} run the work to perform with the doubles installed
 */
async function withStubbedModules(stubs, run) {
  const previous = new Map();

  for (const [id, exports] of Object.entries(stubs)) {
    previous.set(id, require.cache[id]);
    require.cache[id] = {
      id,
      filename: id,
      loaded: true,
      exports,
      children: [],
      paths: [],
    };
  }

  try {
    return await run();
  } finally {
    for (const [id, entry] of previous) {
      if (entry === undefined) {
        delete require.cache[id];
      } else {
        require.cache[id] = entry;
      }
    }
  }
}

/**
 * A response double that behaves like an Express response.
 */
function createResponse(req) {
  const response = {
    statusCode: 200,
    body: undefined,
    headers: {},
    set(name, value) {
      response.headers[name] = value;
      return response;
    },
    status(code) {
      response.statusCode = code;
      return response;
    },
    json(body) {
      response.body = body;
      return response;
    },
  };

  if (req) {
    errorEnvelopeMiddleware(req, response, () => {});
  }

  return response;
}

function createRequest(overrides) {
  return Object.assign(
    {
      params: { toolId: 'planner.tasks.list' },
      body: {
        actor_id: PERSON_A,
        household_id: HOUSEHOLD_H1,
        args: {},
      },
      headers: { authorization: `Bearer ${ACCESS_TOKEN}` },
      user: { id: AUTH_USER_ID },
      accessToken: ACCESS_TOKEN,
      requestId: 'req-homi-freeze-http',
    },
    overrides || {}
  );
}

/**
 * Load the real Homi controller with a real executor, but with the context
 * authority and the binding map replaced by deterministic doubles.
 */
function loadHomiHttpStack(options) {
  const resolverPath = require.resolve('../../backend/src/homi/contextResolver');
  const bindingsPath = require.resolve('../../backend/src/homiRuntime/toolBindings');
  const observabilityPath = require.resolve('../../backend/src/homiRuntime/observability');
  const executorPath = require.resolve('../../backend/src/homiRuntime/toolExecutor');
  const controllerPath = require.resolve('../../backend/src/controllers/homi.controller');

  const previous = new Map(
    [resolverPath, bindingsPath, observabilityPath, executorPath, controllerPath].map((id) => [
      id,
      require.cache[id],
    ])
  );

  const stub = (id, exports) => {
    require.cache[id] = { id, filename: id, loaded: true, exports, children: [], paths: [] };
  };

  const realResolver = previous.get(resolverPath)?.exports ?? require(resolverPath);
  const realBindings = previous.get(bindingsPath)?.exports ?? require(bindingsPath);
  const realObservability = previous.get(observabilityPath)?.exports ?? require(observabilityPath);

  stub(
    resolverPath,
    Object.assign({}, realResolver, {
      resolveHomiExecutionContext: async () => ({
        context: options.context ?? buildHomiContext(),
        canonical: options.canonical ?? buildCanonicalContext(),
      }),
    })
  );
  stub(bindingsPath, Object.assign({}, realBindings, { TOOL_BINDINGS: options.bindings }));
  stub(
    observabilityPath,
    Object.assign({}, realObservability, {
      homiObservability: options.observability ?? realObservability.homiObservability,
    })
  );
  delete require.cache[executorPath];
  delete require.cache[controllerPath];

  const controller = require(controllerPath);

  return {
    controller,
    restore() {
      for (const [id, entry] of previous) {
        if (entry === undefined) {
          delete require.cache[id];
        } else {
          require.cache[id] = entry;
        }
      }
    },
  };
}

/**
 * Capture the outcome of a canonical Planner controller.
 */
async function captureCanonicalController(controllerRelativePath, exportName, options) {
  const stubs = {
    // The canonical Planner modules load the Supabase client at import time.
    // The backend runtime dependency is not installed in this environment, so
    // the data client is replaced by an inert double: the parity proof only
    // needs the authorization and the service call, never a real client.
    [require.resolve('../../backend/src/config/supabase')]: {
      supabase: {},
      supabaseAuth: {},
      supabaseAdmin: {},
      createSupabaseForToken: () => ({}),
      hasSupabaseAdmin: false,
    },
    [require.resolve('../../backend/src/services/planner.context.service')]: {
      getPlannerContext: async () => options.context,
    },
  };

  for (const [key, value] of Object.entries(options.services)) {
    stubs[require.resolve(`../../backend/src/services/planner.${key}.service`)] = value;
  }

  // The controller module is reloaded with the doubles, so it never keeps a
  // context authority or a service of a previous scenario.
  const controllerPath = require.resolve(controllerRelativePath);
  const previousController = require.cache[controllerPath];
  delete require.cache[controllerPath];

  try {
    return await withStubbedModules(stubs, async () => {
      const controller = require(controllerPath);
      const req = options.req ?? { query: {}, params: {}, body: {}, requestId: 'req-parity' };
      const response = createResponse(req);

      await controller[exportName](req, response);

      return {
        status: response.statusCode,
        code: response.body?.error?.code ?? response.body?.code ?? null,
        body: response.body,
      };
    });
  } finally {
    if (previousController === undefined) {
      delete require.cache[controllerPath];
    } else {
      require.cache[controllerPath] = previousController;
    }
  }
}

/**
 * Capture the outcome of a Homi handler.
 */
async function captureHomiHandler(handler, context, args) {
  try {
    const body = await handler(context, args, { requestId: 'req-parity', homiContext: buildHomiContext() });
    return { status: 200, code: null, body };
  } catch (error) {
    return {
      status: error.statusCode ?? 500,
      code: error.code ?? null,
      body: null,
      error,
    };
  }
}

function readSource(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

function readSourceCode(relativePath) {
  return readSource(relativePath)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function listHomiProductionSources() {
  const roots = [
    path.join(repositoryRoot, 'backend', 'src', 'homi'),
    path.join(repositoryRoot, 'backend', 'src', 'homiRuntime'),
  ];

  const files = [];

  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        files.push(full);
      }
    }
  };

  for (const root of roots) {
    walk(root);
  }

  files.push(path.join(repositoryRoot, 'backend', 'src', 'controllers', 'homi.controller.js'));
  files.push(path.join(repositoryRoot, 'backend', 'src', 'routes', 'homi.js'));

  return files.sort();
}

function relativeOf(absolutePath) {
  return path.relative(repositoryRoot, absolutePath).replace(/\\/g, '/');
}

// ---------------------------------------------------------------------------
// 1. Frozen tool surface (S2 / S12)
// ---------------------------------------------------------------------------

test('the production Homi tool surface is exactly the eight canonical Planner READ tools', () => {
  const registry = createDefaultHomiToolRegistry();
  const registered = registry.list().map((tool) => tool.id).sort();

  assert.deepEqual(registered, Array.from(CANONICAL_TOOL_IDS).sort());
  assert.equal(registered.length, 8);
});

test('every production Homi tool is a READ tool and no production tool is a WRITE tool', () => {
  const registry = createDefaultHomiToolRegistry();

  let writeTools = 0;

  for (const definition of registry.list()) {
    if (definition.kind === 'WRITE') writeTools += 1;

    assert.equal(definition.kind, 'READ', `${definition.id} must be a READ tool`);
    assert.deepEqual(Array.from(definition.riskFlags), ['READ_ONLY'], `${definition.id} must be read only`);
    assert.equal(definition.confirmation, 'NEVER', `${definition.id} must never ask for a confirmation`);
  }

  assert.equal(writeTools, 0);
});

test('the registered tool ids and the executable binding ids are exactly equal', () => {
  const registry = createDefaultHomiToolRegistry();
  const registered = registry.list().map((tool) => tool.id).sort();
  const bound = listBoundToolIds();

  assert.deepEqual(bound, registered);
  assert.deepEqual(registered, Array.from(CANONICAL_TOOL_IDS).sort());
  assert.equal(new Set(registered).size, registered.length, 'the tool ids must be unique');
});

test('no orphan registry definition and no orphan binding exists', () => {
  const registry = createDefaultHomiToolRegistry();

  for (const toolId of listBoundToolIds()) {
    assert.ok(registry.has(toolId), `${toolId} must be a registered tool`);
  }

  for (const definition of registry.list()) {
    assert.equal(
      typeof TOOL_BINDINGS[definition.id],
      'function',
      `${definition.id} must have an executable binding`
    );
  }
});

test('a duplicate tool id is rejected by the registry', () => {
  const registry = createDefaultHomiToolRegistry();

  assert.throws(
    () => registry.register(createDefaultHomiToolRegistry().get('planner.tasks.list')),
    (error) => {
      assert.equal(error.code, 'HOMI_TOOL_DUPLICATE');
      return true;
    }
  );
});

test('the registered definitions are frozen and cannot be replaced at runtime', () => {
  const registry = createDefaultHomiToolRegistry();
  const definition = registry.get('planner.tasks.list');

  assert.ok(Object.isFrozen(definition));
  assert.ok(Object.isFrozen(definition.inputSchema));
  assert.throws(() => {
    definition.kind = 'WRITE';
  });

  assert.equal(registry.get('planner.tasks.list').kind, 'READ');
  assert.equal(registry.list().length, 8);
});

// ---------------------------------------------------------------------------
// 2. Identity spoofing matrix (S4)
// ---------------------------------------------------------------------------

test('the authoritative actor and household are the only ones that can execute a tool', async () => {
  const { executor, calls } = createExecutor();

  const payload = await executor(buildInvocation());

  assert.equal(payload.ok, true);
  assert.equal(payload.tool_id, 'planner.tasks.list');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].args[0].householdId, HOUSEHOLD_H1);
  assert.equal(calls[0].args[0].membershipId, MEMBERSHIP_M1);
});

test('a foreign actor claim is rejected before the handler for every tool', async () => {
  for (const toolId of CANONICAL_TOOL_IDS) {
    const { executor, calls } = createExecutor();

    await assertRejectsWithCode(
      executor(
        buildInvocation({
          toolId,
          args: VALID_ARGS[toolId],
          claims: { actor_id: PERSON_B, household_id: HOUSEHOLD_H1 },
        })
      ),
      HOMI_CONTEXT_MISMATCH
    );

    assert.equal(calls.length, 0, `${toolId} must not reach the Planner service`);
  }
});

test('a foreign household claim is rejected before the handler for every tool', async () => {
  for (const toolId of CANONICAL_TOOL_IDS) {
    const { executor, calls } = createExecutor();

    await assertRejectsWithCode(
      executor(
        buildInvocation({
          toolId,
          args: VALID_ARGS[toolId],
          claims: { actor_id: PERSON_A, household_id: HOUSEHOLD_H2 },
        })
      ),
      HOMI_CONTEXT_MISMATCH
    );

    assert.equal(calls.length, 0, `${toolId} must not reach the Planner service`);
  }
});

test('a fully foreign identity claim is rejected before the handler for every tool', async () => {
  for (const toolId of CANONICAL_TOOL_IDS) {
    const { executor, calls } = createExecutor();

    await assertRejectsWithCode(
      executor(
        buildInvocation({
          toolId,
          args: VALID_ARGS[toolId],
          claims: { actor_id: PERSON_B, household_id: HOUSEHOLD_H2 },
        })
      ),
      HOMI_CONTEXT_MISMATCH
    );

    assert.equal(calls.length, 0, `${toolId} must not reach the Planner service`);
  }
});

test('a claim that carries an identity field beyond the two canonical ones is rejected', async () => {
  const forbidden = [
    'membership_id',
    'role',
    'auth_user_id',
    'user_id',
    'person_id',
    'access_token',
    'jwt',
    'token',
  ];

  for (const field of forbidden) {
    const { executor, calls } = createExecutor();

    await assertRejectsWithCode(
      executor(
        buildInvocation({
          claims: {
            actor_id: PERSON_A,
            household_id: HOUSEHOLD_H1,
            [field]: 'attacker-value',
          },
        })
      ),
      HOMI_CLAIM_INVALID
    );

    assert.equal(calls.length, 0, `${field} must not reach the Planner service`);
  }
});

test('an identity field inside the tool arguments is rejected before the handler', async () => {
  const forbidden = [
    'membership_id',
    'role',
    'auth_user_id',
    'user_id',
    'person_id',
    'access_token',
    'jwt',
    'token',
  ];

  for (const field of forbidden) {
    const { executor, calls } = createExecutor();

    await assertRejectsWithCode(
      executor(buildInvocation({ args: { [field]: 'attacker-value' } })),
      HOMI_TOOL_ARGUMENT_INVALID
    );

    assert.equal(calls.length, 0, `${field} must not reach the Planner service`);
  }
});

test('an identity field added to the invocation body is rejected before the executor', async () => {
  const forbidden = [
    'membership_id',
    'role',
    'auth_user_id',
    'user_id',
    'person_id',
    'access_token',
    'jwt',
    'token',
  ];

  for (const field of forbidden) {
    const handlerCalls = [];
    const stack = loadHomiHttpStack({
      bindings: createToolBindings({
        'planner.tasks.list': async () => {
          handlerCalls.push(1);
          return { tasks: [] };
        },
      }),
    });

    try {
      const req = createRequest({
        body: {
          actor_id: PERSON_A,
          household_id: HOUSEHOLD_H1,
          args: {},
          [field]: 'attacker-value',
        },
      });
      const response = createResponse(req);

      await stack.controller.invokeTool(req, response);

      assert.equal(response.statusCode, 400);
      assert.equal(response.body.error.code, 'HOMI_REQUEST_INVALID');
      assert.equal(handlerCalls.length, 0);
    } finally {
      stack.restore();
    }
  }
});

test('the authoritative boundary never receives the caller claims', async () => {
  const { executor, resolver, calls } = createExecutor();

  await executor(buildInvocation({ claims: { actor_id: PERSON_A, household_id: HOUSEHOLD_H1 } }));

  assert.equal(resolver.calls.length, 1);
  assert.deepEqual(Object.keys(resolver.calls[0]).sort(), ['accessToken', 'user']);
  assert.equal(resolver.calls[0].accessToken, ACCESS_TOKEN);
  assert.equal(calls[0].args[0].householdId, HOUSEHOLD_H1);
});

test('a missing authenticated authority is rejected before the handler', async () => {
  for (const toolId of CANONICAL_TOOL_IDS) {
    const { executor, calls } = createExecutor();

    await assertRejectsWithCode(
      executor(buildInvocation({ toolId, args: VALID_ARGS[toolId], accessToken: undefined })),
      HOMI_AUTH_CONTEXT_INVALID
    );

    assert.equal(calls.length, 0);
  }
});

// ---------------------------------------------------------------------------
// 3. Cross household resource access (S5)
// ---------------------------------------------------------------------------

test('a task of another household is not addressable and leaks nothing', async () => {
  const { executor, calls } = createExecutor();

  await assert.rejects(
    executor(buildInvocation({ toolId: 'planner.tasks.get', args: { taskId: FOREIGN_TASK_ID } })),
    (error) => {
      assert.equal(error.code, 'task_not_found');
      assert.equal(error.statusCode, 404);
      return true;
    }
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].args[0].householdId, HOUSEHOLD_H1);
});

test('an event of another household is not addressable and leaks nothing', async () => {
  const { executor, calls } = createExecutor();

  await assert.rejects(
    executor(buildInvocation({ toolId: 'planner.events.get', args: { eventId: FOREIGN_EVENT_ID } })),
    (error) => {
      assert.equal(error.code, 'event_not_found');
      assert.equal(error.statusCode, 404);
      return true;
    }
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].args[0].householdId, HOUSEHOLD_H1);
});

test('the listing and search reads never return a row of another household', async () => {
  const { executor } = createExecutor();

  const listings = [
    ['planner.tasks.list', {}],
    ['planner.events.list', {}],
    ['planner.calendar.get', {}],
    ['planner.search.query', { query: 'privado' }],
    ['planner.attention.get', {}],
    ['planner.summary.get', {}],
  ];

  for (const [toolId, args] of listings) {
    const payload = await executor(buildInvocation({ toolId, args }));
    const serialized = JSON.stringify(payload);

    assert.ok(!serialized.includes(FOREIGN_TASK_ID), `${toolId} must not return a foreign task`);
    assert.ok(!serialized.includes(FOREIGN_EVENT_ID), `${toolId} must not return a foreign event`);
    assert.ok(!serialized.includes(HOUSEHOLD_H2), `${toolId} must not return a foreign household`);
    assert.ok(!serialized.includes(MEMBERSHIP_H2), `${toolId} must not return a foreign membership`);
    assert.ok(!serialized.includes('privado de H2'), `${toolId} must not return foreign content`);
  }
});

test('the Planner service always receives the authoritative household of the caller', async () => {
  const { executor, calls } = createExecutor();

  for (const toolId of CANONICAL_TOOL_IDS) {
    await executor(buildInvocation({ toolId, args: VALID_ARGS[toolId] }));
  }

  assert.equal(calls.length, 8);

  for (const call of calls) {
    assert.equal(call.args[0].householdId, HOUSEHOLD_H1);
    assert.equal(call.args[0].membershipId, MEMBERSHIP_M1);
    assert.equal(call.args[0].personId, PERSON_A);
  }
});

test('no Homi production source selects a household of its own', () => {
  const handlerSource = readSourceCode('backend/src/homiRuntime/tools/plannerReadHandlers.js');

  assert.doesNotMatch(handlerSource, /household_id/, 'a Homi handler must not select a household');
  assert.doesNotMatch(handlerSource, /householdId\s*[:=]/, 'a Homi handler must not build a household');
});

test('no Homi tool declares an identity or a household argument', () => {
  const registry = createDefaultHomiToolRegistry();

  for (const definition of registry.list()) {
    const properties = Object.keys(definition.inputSchema.properties ?? {});

    for (const field of properties) {
      assert.ok(
        !/^(actor|actor_id|household|household_id|membership|membership_id|role|auth_user_id|user_id|person_id|access_token|jwt|token)$/.test(
          field
        ),
        `${definition.id} must not declare "${field}"`
      );
    }
  }
});

test('the canonical Planner reads are scoped by the authoritative household', () => {
  const services = [
    'backend/src/services/planner.tasks.service.js',
    'backend/src/services/planner.events.service.js',
    'backend/src/services/planner.calendar.service.js',
    'backend/src/services/planner.search.service.js',
    'backend/src/services/planner.summary.service.js',
    'backend/src/services/planner.attention.service.js',
  ];

  for (const relativePath of services) {
    const source = readSourceCode(relativePath);

    assert.ok(
      source.includes('context.householdId'),
      `${relativePath} must scope its reads by the authoritative household`
    );
  }
});

// ---------------------------------------------------------------------------
// 4. Authorization parity and the calendar review (S6 / S7)
// ---------------------------------------------------------------------------

const PARITY_MATRIX = Object.freeze([
  {
    toolId: 'planner.tasks.list',
    controller: '../../backend/src/controllers/planner.tasks.controller',
    exportName: 'listTasks',
    serviceKey: 'tasks',
    args: {},
    req: { query: {}, params: {}, body: {} },
  },
  {
    toolId: 'planner.tasks.get',
    controller: '../../backend/src/controllers/planner.tasks.controller',
    exportName: 'getTaskById',
    serviceKey: 'tasks',
    args: { taskId: TASK_ID },
    req: { query: {}, params: { id: TASK_ID }, body: {} },
  },
  {
    toolId: 'planner.events.list',
    controller: '../../backend/src/controllers/planner.events.controller',
    exportName: 'listEvents',
    serviceKey: 'events',
    args: {},
    req: { query: {}, params: {}, body: {} },
  },
  {
    toolId: 'planner.events.get',
    controller: '../../backend/src/controllers/planner.events.controller',
    exportName: 'getEventById',
    serviceKey: 'events',
    args: { eventId: EVENT_ID },
    req: { query: {}, params: { id: EVENT_ID }, body: {} },
  },
  {
    toolId: 'planner.calendar.get',
    controller: '../../backend/src/controllers/planner.calendar.controller',
    exportName: 'getCalendar',
    serviceKey: 'calendar',
    args: {},
    req: { query: {}, params: {}, body: {} },
  },
  {
    toolId: 'planner.summary.get',
    controller: '../../backend/src/controllers/planner.summary.controller',
    exportName: 'getSummary',
    serviceKey: 'summary',
    args: {},
    req: { query: {}, params: {}, body: {} },
  },
  {
    toolId: 'planner.attention.get',
    controller: '../../backend/src/controllers/planner.attention.controller',
    exportName: 'getAttention',
    serviceKey: 'attention',
    args: {},
    req: { query: {}, params: {}, body: {} },
  },
  {
    toolId: 'planner.search.query',
    controller: '../../backend/src/controllers/planner.search.controller',
    exportName: 'searchPlanner',
    serviceKey: 'search',
    args: { query: 'cocina' },
    req: { query: { q: 'cocina' }, params: {}, body: {} },
  },
]);

test('the Homi layer preserves the canonical authorization of every Planner read', async () => {
  for (const entry of PARITY_MATRIX) {
    const { services } = createServiceDoubles();
    const handlers = createPlannerReadHandlers(services);
    const context = buildCanonicalContext();

    const canonical = await captureCanonicalController(entry.controller, entry.exportName, {
      context,
      services: { [entry.serviceKey]: services[entry.serviceKey] },
      req: Object.assign({ requestId: 'req-parity' }, entry.req),
    });

    const homi = await captureHomiHandler(handlers[entry.toolId], context, entry.args);

    assert.equal(homi.status, canonical.status, `${entry.toolId} must keep the canonical status`);
    assert.equal(homi.code, canonical.code, `${entry.toolId} must keep the canonical error code`);
  }
});

test('the Homi layer preserves the canonical denial when planner.view is revoked', async () => {
  for (const entry of PARITY_MATRIX) {
    const { services } = createServiceDoubles();
    const handlers = createPlannerReadHandlers(services);

    const context = buildCanonicalContext({
      membership: {
        id: MEMBERSHIP_M1,
        household_id: HOUSEHOLD_H1,
        person_id: PERSON_A,
        status: 'active',
        role: 'guest',
      },
      role: 'guest',
      household: {
        id: HOUSEHOLD_H1,
        config: { permissions: { 'planner.view': { guest: false } } },
      },
    });

    const canonical = await captureCanonicalController(entry.controller, entry.exportName, {
      context,
      services: { [entry.serviceKey]: services[entry.serviceKey] },
      req: Object.assign({ requestId: 'req-parity' }, entry.req),
    });

    const homi = await captureHomiHandler(handlers[entry.toolId], context, entry.args);

    assert.equal(homi.status, canonical.status, `${entry.toolId} must keep the canonical status`);
    assert.equal(homi.code, canonical.code, `${entry.toolId} must keep the canonical error code`);
  }
});

test('the Homi layer preserves the canonical denial of the search capability', async () => {
  const { services } = createServiceDoubles();
  const handlers = createPlannerReadHandlers(services);

  const context = buildCanonicalContext({
    membership: {
      id: MEMBERSHIP_M1,
      household_id: HOUSEHOLD_H1,
      person_id: PERSON_A,
      status: 'active',
      role: 'guest',
    },
    role: 'guest',
  });

  const canonical = await captureCanonicalController(
    '../../backend/src/controllers/planner.search.controller',
    'searchPlanner',
    {
      context,
      services: { search: services.search },
      req: { query: { q: 'cocina' }, body: {}, requestId: 'req-parity' },
    }
  );

  const homi = await captureHomiHandler(handlers['planner.search.query'], context, { query: 'cocina' });

  assert.equal(canonical.status, 403);
  assert.equal(canonical.code, 'planner_forbidden');
  assert.equal(homi.status, 403);
  assert.equal(homi.code, 'planner_forbidden');
});

test('the calendar read is constrained by the canonical planner.view capability at the data layer', () => {
  const calendarController = readSourceCode('backend/src/controllers/planner.calendar.controller.js');

  assert.doesNotMatch(
    calendarController,
    /assertCapability/,
    'the canonical calendar controller does not assert a capability of its own'
  );

  const migration = readSource('supabase/migrations/20260722030000_m11_2a_event_domain_foundation.sql');
  const policy = migration.slice(
    migration.indexOf('create policy "planner_events_select_v1_scope"'),
    migration.indexOf('create policy "planner_event_series_select_v1"')
  );

  assert.ok(policy.includes("planner_event_actor_has_capability(household_id, 'planner.view')"));
  assert.ok(policy.includes("hm.status = 'active'") || policy.includes('planner_event_actor_has_capability'));
});

test('the calendar read is scoped by the authoritative household', () => {
  const source = readSourceCode('backend/src/services/planner.calendar.service.js');

  assert.ok(source.includes('context.householdId'));
  assert.ok(source.includes('planner_events'));
});

test('the calendar read keeps exactly the authority of the canonical Planner calendar route', async () => {
  const { services } = createServiceDoubles();
  const handlers = createPlannerReadHandlers(services);
  const context = buildCanonicalContext();

  const canonical = await captureCanonicalController(
    '../../backend/src/controllers/planner.calendar.controller',
    'getCalendar',
    {
      context,
      services: { calendar: services.calendar },
      req: { query: {}, params: {}, body: {}, requestId: 'req-parity' },
    }
  );

  const homi = await captureHomiHandler(handlers['planner.calendar.get'], context, {});

  // The canonical calendar route does not assert a capability of its own, so
  // the Homi tool must not invent a stricter one either: the calendar read is
  // constrained by the active household context, by the household filter of
  // the canonical service and by the planner.view RLS policy of
  // planner_events.
  assert.equal(canonical.status, 200);
  assert.equal(homi.status, 200);
  assert.equal(homi.code, canonical.code);

  const handlerSource = readSourceCode('backend/src/homiRuntime/tools/plannerReadHandlers.js');
  const calendarHandler = handlerSource.slice(
    handlerSource.indexOf("'planner.calendar.get'"),
    handlerSource.indexOf("'planner.summary.get'")
  );

  assert.doesNotMatch(calendarHandler, /assertCapability/, 'the calendar handler must not diverge');
});

test('the Homi layer invents no permission system of its own', () => {
  const handlerSource = readSourceCode('backend/src/homiRuntime/tools/plannerReadHandlers.js');

  assert.ok(handlerSource.includes("require('../../lib/plannerCapabilities')"));
  assert.doesNotMatch(handlerSource, /\bpermissions\s*[:=]/, 'no Homi specific permission map');
  assert.doesNotMatch(handlerSource, /\badmin\b/, 'no Homi specific role check');
  assert.doesNotMatch(handlerSource, /allowlist|whitelist|blacklist/i, 'no Homi specific access list');
});

// ---------------------------------------------------------------------------
// 5. The event identifier boundary (S8)
// ---------------------------------------------------------------------------

test('a malformed event identifier is answered like an absent event and never reaches the service', async () => {
  const { executor, calls } = createExecutor();

  await assert.rejects(
    executor(buildInvocation({ toolId: 'planner.events.get', args: { eventId: 'not-a-uuid' } })),
    (error) => {
      assert.equal(error.code, 'event_not_found');
      assert.equal(error.statusCode, 404);
      return true;
    }
  );

  assert.equal(calls.length, 0, 'a malformed identifier must not reach the Planner service');
});

test('a malformed task identifier is answered like an absent task and never reaches the service', async () => {
  const { executor, calls } = createExecutor();

  await assert.rejects(
    executor(buildInvocation({ toolId: 'planner.tasks.get', args: { taskId: 'not-a-uuid' } })),
    (error) => {
      assert.equal(error.code, 'task_not_found');
      assert.equal(error.statusCode, 404);
      return true;
    }
  );

  assert.equal(calls.length, 0);
});

test('the event identifier guard reuses the canonical Planner not-found outcome', () => {
  assert.deepEqual(EVENT_NOT_FOUND, {
    status: 404,
    message: 'Evento no encontrado.',
    code: 'event_not_found',
  });
  assert.deepEqual(TASK_NOT_FOUND, {
    status: 404,
    message: 'Tarea no encontrada.',
    code: 'task_not_found',
  });
});

test('the canonical Planner identifier of a task and of an event is a uuid', () => {
  const migration = readSource('supabase/migrations/202606230001_planner_mvp.sql');

  assert.ok(/create table if not exists public\.planner_events \(\s*\n\s*id uuid primary key/.test(migration));
  assert.ok(/create table if not exists public\.planner_tasks \(\s*\n\s*id uuid primary key/.test(migration));
});

test('a canonical uuid identifier reaches the Planner service unchanged', async () => {
  const { executor, calls } = createExecutor();

  await executor(buildInvocation({ toolId: 'planner.events.get', args: { eventId: EVENT_ID } }));

  assert.equal(calls.length, 1);
  assert.equal(calls[0].args[1], EVENT_ID);
});

test('the canonical Planner event route has no uuid parameter guard, the Homi tool does', () => {
  const routeSource = readSourceCode('backend/src/routes/planner.js');

  assert.ok(routeSource.includes("requireUuidParams(['id', 'taskId', 'fulfillmentId']"));
  assert.doesNotMatch(
    routeSource,
    /requireUuidParams\(\s*\[[^\]]*\/events\/:id/,
    'the event route declares no uuid guard'
  );

  const handlerSource = readSourceCode('backend/src/homiRuntime/tools/plannerReadHandlers.js');
  assert.ok(handlerSource.includes('assertUuid(args.eventId, EVENT_NOT_FOUND)'));
  assert.ok(handlerSource.includes('assertUuid(args.taskId, TASK_NOT_FOUND)'));
});

// ---------------------------------------------------------------------------
// 6. Argument adversarial matrix (S9)
// ---------------------------------------------------------------------------

const ARGUMENT_MATRIX = [
  ['planner.tasks.list', { status: 'not-a-status' }, 'invalid_enum'],
  ['planner.tasks.list', { limit: '10' }, 'invalid_type'],
  ['planner.tasks.list', { limit: 101 }, 'above_maximum'],
  ['planner.tasks.list', { limit: -1 }, 'below_minimum'],
  ['planner.tasks.list', { limit: 1.5 }, 'invalid_type'],
  ['planner.tasks.list', { limit: {} }, 'invalid_type'],
  ['planner.tasks.list', { includeCancelled: 'true' }, 'invalid_type'],
  ['planner.tasks.list', { from: '04-03-2026' }, 'pattern_mismatch'],
  ['planner.tasks.list', { to: 'ayer' }, 'pattern_mismatch'],
  ['planner.tasks.list', { unexpected: true }, 'unknown_argument'],
  ['planner.tasks.get', {}, 'missing_required_argument'],
  ['planner.tasks.get', { taskId: '' }, 'too_short'],
  ['planner.tasks.get', { taskId: 42 }, 'invalid_type'],
  ['planner.tasks.get', { taskId: [] }, 'invalid_type'],
  ['planner.tasks.get', { taskId: TASK_ID, extra: 'x' }, 'unknown_argument'],
  ['planner.events.list', { status: 'invented' }, 'invalid_enum'],
  ['planner.events.list', { includeRecurring: 'yes' }, 'invalid_type'],
  ['planner.events.list', { from: 20260304 }, 'invalid_type'],
  ['planner.events.get', {}, 'missing_required_argument'],
  ['planner.events.get', { eventId: '' }, 'too_short'],
  ['planner.events.get', { eventId: null }, 'invalid_type'],
  ['planner.calendar.get', { view: 'year' }, 'invalid_enum'],
  ['planner.calendar.get', { date: '2026/03/04' }, 'pattern_mismatch'],
  ['planner.calendar.get', { view: 'day', unexpected: 1 }, 'unknown_argument'],
  ['planner.summary.get', { anything: 'x' }, 'unknown_argument'],
  ['planner.attention.get', { limit: 101 }, 'above_maximum'],
  ['planner.attention.get', { limit: 0 }, 'below_minimum'],
  ['planner.attention.get', { limit: '50' }, 'invalid_type'],
  ['planner.search.query', {}, 'missing_required_argument'],
  ['planner.search.query', { query: '' }, 'too_short'],
  ['planner.search.query', { query: 'cocina', limit: 51 }, 'above_maximum'],
  ['planner.search.query', { query: 7 }, 'invalid_type'],
];

test('every invalid argument class is rejected before the handler and before the Planner service', async () => {
  for (const [toolId, args, reason] of ARGUMENT_MATRIX) {
    const { executor, calls } = createExecutor();

    await assert.rejects(
      executor(buildInvocation({ toolId, args })),
      (error) => {
        assert.equal(error.code, HOMI_TOOL_ARGUMENT_INVALID, `${toolId} ${reason}`);
        assert.equal(error.statusCode, 400);
        assert.equal(error.details.reason, reason, `${toolId} ${reason}`);
        return true;
      }
    );

    assert.equal(calls.length, 0, `${toolId} ${reason} must not reach the Planner service`);
  }
});

test('the arguments themselves must be a plain object', async () => {
  for (const args of [null, [], 'cocina', 42, true]) {
    const { executor, calls } = createExecutor();

    await assertRejectsWithCode(
      executor(buildInvocation({ args })),
      HOMI_TOOL_ARGUMENT_INVALID
    );

    assert.equal(calls.length, 0);
  }
});

test('a rejected argument is never echoed into the error', async () => {
  const marker = 'injected-attacker-value';

  const { executor } = createExecutor();

  await assert.rejects(
    executor(buildInvocation({ toolId: 'planner.tasks.list', args: { unexpected: marker } })),
    (error) => {
      const serialized = `${error.message} ${JSON.stringify(error.details)}`;
      assert.ok(!serialized.includes(marker), 'the rejected value must not be echoed');
      return true;
    }
  );
});

test('no argument is ever coerced', async () => {
  const { executor } = createExecutor();

  await assertRejectsWithCode(
    executor(buildInvocation({ toolId: 'planner.tasks.list', args: { limit: '10' } })),
    HOMI_TOOL_ARGUMENT_INVALID
  );
});

// ---------------------------------------------------------------------------
// 7. Tool id adversarial matrix (S10)
// ---------------------------------------------------------------------------

const HOSTILE_TOOL_IDS = Object.freeze([
  'planner.fake.whatever',
  'planner.tasks.create',
  'planner.tasks.delete',
  'finance.accounts.list',
  '../planner/tasks',
  'planner.tasks.list/../../x',
  'PLANNER.TASKS.LIST',
  'planner.tasks.list%00',
  'planner.tasks',
  'homi.planner.tasks.list',
  '../../../../etc/passwd',
  'constructor',
  '__proto__',
  'toString',
]);

test('every hostile tool id is rejected before any handler runs', async () => {
  for (const toolId of HOSTILE_TOOL_IDS) {
    const { executor, calls } = createExecutor();

    await assertRejectsWithCode(
      executor(buildInvocation({ toolId })),
      HOMI_TOOL_NOT_FOUND
    );

    assert.equal(calls.length, 0, `${toolId} must not reach the Planner service`);
  }
});

test('a tool id with surrounding whitespace resolves to the canonical tool and nothing else', async () => {
  const { executor, calls } = createExecutor();

  const payload = await executor(buildInvocation({ toolId: '  planner.tasks.list  ' }));

  assert.equal(payload.ok, true);
  assert.equal(payload.tool_id, 'planner.tasks.list');
  assert.equal(calls.length, 1);
});

test('an empty tool id is rejected and never resolves a binding', async () => {
  const { executor, calls } = createExecutor();

  await assertRejectsWithCode(executor(buildInvocation({ toolId: '' })), HOMI_TOOL_NOT_FOUND);
  await assertRejectsWithCode(executor(buildInvocation({ toolId: '   ' })), HOMI_TOOL_NOT_FOUND);
  await assertRejectsWithCode(executor(buildInvocation({ toolId: undefined })), HOMI_TOOL_NOT_FOUND);
  await assertRejectsWithCode(executor(buildInvocation({ toolId: 42 })), HOMI_TOOL_NOT_FOUND);

  assert.equal(calls.length, 0);
});

test('a tool id is never resolved through the filesystem or through a dynamic require', () => {
  for (const absolutePath of listHomiProductionSources()) {
    const source = readSourceCode(relativeOf(absolutePath));

    assert.doesNotMatch(source, /\beval\s*\(/, `${relativeOf(absolutePath)} must not evaluate code`);
    assert.doesNotMatch(source, /new\s+Function\s*\(/, `${relativeOf(absolutePath)} must not evaluate code`);
    assert.doesNotMatch(
      source,
      /require\s*\(\s*[a-zA-Z_$][\w$]*\s*\)/,
      `${relativeOf(absolutePath)} must not require a dynamic path`
    );
    assert.doesNotMatch(source, /\bfs\./, `${relativeOf(absolutePath)} must not touch the filesystem`);
    assert.doesNotMatch(source, /\bpath\.(join|resolve)\b/, `${relativeOf(absolutePath)} must not resolve a path`);
  }
});

test('the binding map is a plain frozen lookup and carries no fallback handler', () => {
  assert.ok(Object.isFrozen(TOOL_BINDINGS));

  for (const toolId of Object.keys(TOOL_BINDINGS)) {
    assert.equal(typeof TOOL_BINDINGS[toolId], 'function');
  }

  assert.equal(Object.getPrototypeOf(TOOL_BINDINGS), Object.prototype);
  assert.equal(TOOL_BINDINGS['planner.fake.whatever'], undefined);
  assert.equal(TOOL_BINDINGS[''], undefined);
});

// ---------------------------------------------------------------------------
// 8. The write and mutation gate (S11 / S19)
// ---------------------------------------------------------------------------

test('a registered WRITE tool is rejected even when its binding exists', async () => {
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

  let handlerCalls = 0;

  const { executor, calls } = createExecutor({
    registry,
    bindings: createToolBindings({
      'planner.synthetic.write': async () => {
        handlerCalls += 1;
        return { ok: true };
      },
    }),
  });

  await assertRejectsWithCode(
    executor(buildInvocation({ toolId: 'planner.synthetic.write' })),
    HOMI_TOOL_NOT_READ
  );

  assert.equal(handlerCalls, 0);
  assert.equal(calls.length, 0);
});

test('the production bindings call only the canonical READ service authorities', () => {
  const source = readSourceCode('backend/src/homiRuntime/tools/plannerReadHandlers.js');
  const calls = [...source.matchAll(/service\.([A-Za-z0-9_]+)\s*\(/g)].map((match) => match[1]);

  assert.deepEqual([...new Set(calls)].sort(), Array.from(ALLOWED_SERVICE_CALLS).sort());
});

test('no Homi production source calls a mutation authority of the Planner', () => {
  const mutationPattern =
    /\.(create|update|delete|remove|destroy|restore|archive|unarchive|complete|cancel|transition|assign|submit|approve|reject|trash|reactivate|claim|release|mutate|upsert|insert|patch|put|post)\s*\(/g;

  // The only matches that the Homi layer may contain are context sensitive
  // false positives, and every one of them is justified explicitly.
  const justified = {
    'backend/src/homi/toolContract.js': [
      'delete: ancestors.delete(value) removes an element from a local Set of schema ancestors, it deletes no data',
    ],
    'backend/src/routes/homi.js': [
      'post: router.post() registers the read invocation route, the verb mutates nothing',
    ],
  };

  for (const absolutePath of listHomiProductionSources()) {
    const relativePath = relativeOf(absolutePath);
    const source = readSourceCode(relativePath);
    const matches = [...source.matchAll(mutationPattern)].map((match) => match[0]);

    for (const match of matches) {
      const method = match.slice(1).split('(')[0].toLowerCase();
      const reasons = justified[relativePath] ?? [];

      assert.ok(
        reasons.some((reason) => reason.toLowerCase().startsWith(`${method}:`)),
        `${relativePath} must not call a mutation authority (${match})`
      );
    }
  }
});

test('the eight handlers call only the expected READ service functions', async () => {
  const { executor, calls } = createExecutor();

  for (const toolId of CANONICAL_TOOL_IDS) {
    await executor(buildInvocation({ toolId, args: VALID_ARGS[toolId] }));
  }

  assert.deepEqual(
    calls.map((call) => call.name).sort(),
    [
      'getCalendar',
      'getEventById',
      'getSummary',
      'getTaskById',
      'listAttention',
      'listEvents',
      'listTasks',
      'searchActive',
    ]
  );
});

// ---------------------------------------------------------------------------
// 9. The HTTP surface (S13)
// ---------------------------------------------------------------------------

test('only the POST invocation route exists', () => {
  const routeSource = readSourceCode('backend/src/routes/homi.js');

  assert.ok(routeSource.includes('router.post('));
  assert.doesNotMatch(routeSource, /router\.(get|put|patch|delete)\s*\(/);
});

test('the authentication middleware runs before the invocation route', () => {
  const routeSource = readSourceCode('backend/src/routes/homi.js');

  const middlewarePosition = routeSource.indexOf('router.use(authFinalMiddleware)');
  const routePosition = routeSource.indexOf('router.post(');

  assert.ok(middlewarePosition >= 0);
  assert.ok(middlewarePosition < routePosition);
});

test('the Homi route declares no debug endpoint and no second parser', () => {
  const routeSource = readSourceCode('backend/src/routes/homi.js');

  assert.doesNotMatch(routeSource, /express\.json|express\.urlencoded/, 'no second body parser');
  assert.doesNotMatch(routeSource, /\bdebug\b|\bhealth\b|\bstatus\b/i, 'no debug endpoint');
});

test('the invocation body is exact and the tool id comes only from the route', async () => {
  let executorCalls = 0;

  const stack = loadHomiHttpStack({
    bindings: createToolBindings({
      'planner.tasks.list': async () => {
        executorCalls += 1;
        return { tasks: [] };
      },
    }),
  });

  try {
    const forbidden = ['handler', 'service', 'module', 'file', 'path', 'tool', 'tool_id', 'toolId'];

    for (const field of forbidden) {
      const req = createRequest({
        body: { actor_id: PERSON_A, household_id: HOUSEHOLD_H1, args: {}, [field]: 'attacker-value' },
      });
      const response = createResponse(req);

      await stack.controller.invokeTool(req, response);

      assert.equal(response.statusCode, 400, field);
      assert.equal(response.body.error.code, 'HOMI_REQUEST_INVALID', field);
    }

    assert.equal(executorCalls, 0);
  } finally {
    stack.restore();
  }
});

test('a body that is not an object is rejected by the canonical validation path', async () => {
  const stack = loadHomiHttpStack({
    bindings: createToolBindings({ 'planner.tasks.list': async () => ({ tasks: [] }) }),
  });

  try {
    for (const body of [null, [], 'text', 42]) {
      const req = createRequest({ body });
      const response = createResponse(req);

      await stack.controller.invokeTool(req, response);

      assert.equal(response.statusCode, 400);
      assert.equal(response.body.error.code, 'HOMI_REQUEST_INVALID');
    }
  } finally {
    stack.restore();
  }
});

test('the response never carries the token, the context or the data client', async () => {
  const stack = loadHomiHttpStack({
    bindings: createToolBindings({
      'planner.tasks.list': async () => ({ tasks: [{ id: TASK_ID, title: 'Limpiar la cocina' }] }),
    }),
  });

  try {
    const req = createRequest();
    const response = createResponse(req);

    await stack.controller.invokeTool(req, response);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(Object.keys(response.body).sort(), ['ok', 'result', 'tool_id']);

    const serialized = JSON.stringify(response.body);
    assert.ok(!serialized.includes(ACCESS_TOKEN));
    assert.ok(!serialized.includes('canonical-client-must-not-leak'));
    assert.ok(!serialized.includes(AUTH_USER_ID));
  } finally {
    stack.restore();
  }
});

test('an unknown tool is rejected deterministically over the canonical error envelope', async () => {
  const stack = loadHomiHttpStack({
    bindings: createToolBindings({ 'planner.tasks.list': async () => ({ tasks: [] }) }),
  });

  try {
    const req = createRequest({ params: { toolId: 'planner.fake.whatever' } });
    const response = createResponse(req);

    await stack.controller.invokeTool(req, response);

    assert.equal(response.statusCode, 404);
    assert.equal(response.body.error.code, HOMI_TOOL_NOT_FOUND);
    assert.equal(response.body.error.request_id, 'req-homi-freeze-http');
  } finally {
    stack.restore();
  }
});

// ---------------------------------------------------------------------------
// 10. The secret and data leak gate (S14)
// ---------------------------------------------------------------------------

test('a failure never exposes the token, the context, the client or a raw row', async () => {
  const { executor } = createExecutor({
    bindings: createToolBindings({
      'planner.tasks.list': async () => {
        throw new Error('boom with the access token inside');
      },
    }),
  });

  await assert.rejects(
    executor(buildInvocation({ toolId: 'planner.tasks.list' })),
    (error) => {
      assert.equal(error.code, HOMI_TOOL_EXECUTION_FAILED);

      const serialized = JSON.stringify({
        message: error.message,
        details: error.details,
        stack: error.stack,
        name: error.name,
      });

      assert.ok(!serialized.includes(ACCESS_TOKEN));
      assert.ok(!serialized.includes(SECRET_MARKER));
      assert.ok(!serialized.includes('canonical-client-must-not-leak'));
      assert.ok(!serialized.includes(AUTH_USER_ID));
      assert.ok(!serialized.includes('boom with the access token inside'));
      return true;
    }
  );
});

test('the cause of a failure is never enumerable and never serialized', async () => {
  const { executor } = createExecutor({
    bindings: createToolBindings({
      'planner.tasks.list': async () => {
        throw new Error('internal detail');
      },
    }),
  });

  await assert.rejects(
    executor(buildInvocation({ toolId: 'planner.tasks.list' })),
    (error) => {
      assert.ok(!Object.keys(error).includes('cause'));
      assert.ok(!JSON.stringify(error).includes('internal detail'));
      return true;
    }
  );
});

test('no Homi production source reads a credential or prints a context', () => {
  const forbidden = [
    /service[_-]?role/i,
    /SUPABASE_SERVICE_ROLE/i,
    /sb_secret/i,
    /\beyJ[A-Za-z0-9_-]{10,}/,
    /console\.(log|info|debug)\s*\(/,
  ];

  for (const absolutePath of listHomiProductionSources()) {
    const relativePath = relativeOf(absolutePath);
    const source = readSourceCode(relativePath);

    for (const pattern of forbidden) {
      assert.doesNotMatch(source, pattern, `${relativePath} must not handle a credential`);
    }
  }
});

test('the telemetry carries metadata only and no business content', async () => {
  const catalog = createTelemetryCatalog();
  catalog.register(CORE_TELEMETRY_EVENTS);
  catalog.register(HOMI_TELEMETRY_EVENTS);

  const sink = createTestTelemetrySink();
  const observability = createHomiObservability({ telemetry: createTelemetry({ catalog, sink }) });

  const { executor } = createExecutor({ observability });

  await executor(
    buildInvocation({
      toolId: 'planner.tasks.list',
      args: { status: 'pending' },
    })
  );

  assert.ok(sink.events.length >= 2);

  for (const event of sink.events) {
    assert.deepEqual(
      Object.keys(event.properties).sort().filter(
        (key) => !['tool_id', 'actor_id', 'household_id', 'duration_ms', 'outcome', 'error_code'].includes(key)
      ),
      []
    );

    const serialized = JSON.stringify(event);
    assert.ok(!serialized.includes('pending'));
    assert.ok(!serialized.includes(ACCESS_TOKEN));
    assert.ok(!serialized.includes('canonical-client-must-not-leak'));
  }
});

// ---------------------------------------------------------------------------
// 11. The observability failure isolation (S15)
// ---------------------------------------------------------------------------

test('a telemetry failure during the started event does not break the execution', async () => {
  const observability = {
    async started() {
      throw new Error('telemetry is down');
    },
    async succeeded() {},
    async failed() {},
  };

  const { executor, calls } = createExecutor({ observability });

  const payload = await executor(buildInvocation());

  assert.equal(payload.ok, true);
  assert.equal(calls.length, 1, 'the business invocation must happen exactly once');
});

test('a telemetry failure during the terminal event does not break a successful execution', async () => {
  const observability = {
    async started() {},
    async succeeded() {
      throw new Error('telemetry is down');
    },
    async failed() {
      throw new Error('telemetry is down');
    },
  };

  const { executor, calls } = createExecutor({ observability });

  const payload = await executor(buildInvocation());

  assert.equal(payload.ok, true);
  assert.equal(calls.length, 1);
});

test('a telemetry failure during the failed event does not hide the execution failure', async () => {
  const observability = {
    async started() {},
    async succeeded() {},
    async failed() {
      throw new Error('telemetry is down');
    },
  };

  const { executor, calls } = createExecutor({ observability });

  await assertRejectsWithCode(
    executor(buildInvocation({ toolId: 'planner.fake.whatever' })),
    HOMI_TOOL_NOT_FOUND
  );

  assert.equal(calls.length, 0);
});

test('a telemetry failure never produces a duplicated business invocation', async () => {
  const observability = {
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

  const { executor, calls } = createExecutor({ observability });

  await executor(buildInvocation());

  assert.equal(calls.length, 1);
});

// ---------------------------------------------------------------------------
// 12. The request correlation (S16)
// ---------------------------------------------------------------------------

test('the request id survives the executor, the handler and the telemetry', async () => {
  const catalog = createTelemetryCatalog();
  catalog.register(CORE_TELEMETRY_EVENTS);
  catalog.register(HOMI_TELEMETRY_EVENTS);

  const sink = createTestTelemetrySink();
  const observability = createHomiObservability({ telemetry: createTelemetry({ catalog, sink }) });

  let handlerRequestId = null;

  const { executor } = createExecutor({
    observability,
    bindings: createToolBindings({
      'planner.tasks.list': async (context, args, execution) => {
        handlerRequestId = execution.requestId;
        return { tasks: [] };
      },
    }),
  });

  await executor(buildInvocation({ requestId: 'req-homi-freeze-4242' }));

  assert.equal(handlerRequestId, 'req-homi-freeze-4242');

  const requestIds = new Set(sink.events.map((event) => event.correlation.request_id));

  assert.equal(requestIds.size, 1);
  assert.equal([...requestIds][0], 'req-homi-freeze-4242');
});

test('the request id of the HTTP surface reaches the error envelope', async () => {
  const stack = loadHomiHttpStack({
    bindings: createToolBindings({ 'planner.tasks.list': async () => ({ tasks: [] }) }),
  });

  try {
    const req = createRequest({
      params: { toolId: 'planner.fake.whatever' },
      requestId: 'req-homi-freeze-http-9',
    });
    const response = createResponse(req);

    await stack.controller.invokeTool(req, response);

    assert.equal(response.body.error.request_id, 'req-homi-freeze-http-9');
    assert.equal(response.headers['X-Request-Id'], 'req-homi-freeze-http-9');
  } finally {
    stack.restore();
  }
});

test('a direct invocation preserves the supplied request id and generates none', async () => {
  const catalog = createTelemetryCatalog();
  catalog.register(CORE_TELEMETRY_EVENTS);
  catalog.register(HOMI_TELEMETRY_EVENTS);

  const sink = createTestTelemetrySink();
  const observability = createHomiObservability({ telemetry: createTelemetry({ catalog, sink }) });

  const { executor } = createExecutor({ observability });

  await executor(buildInvocation({ requestId: 'req-homi-freeze-direct' }));

  const requestIds = new Set(sink.events.map((event) => event.correlation.request_id));

  assert.deepEqual([...requestIds], ['req-homi-freeze-direct']);
});

test('one request id survives the HTTP surface, the controller, the executor and the telemetry', async () => {
  const observability = createObservabilityDouble();
  const handlerRequestIds = [];

  const stack = loadHomiHttpStack({
    observability,
    bindings: createToolBindings({
      'planner.tasks.list': async (context, args, execution) => {
        handlerRequestIds.push(execution.requestId);
        return { tasks: [] };
      },
    }),
  });

  try {
    const req = createRequest({ requestId: 'req-homi-freeze-chain' });
    const response = createResponse(req);

    await stack.controller.invokeTool(req, response);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(handlerRequestIds, ['req-homi-freeze-chain']);

    const requestIds = new Set(observability.events.map((event) => event.requestId));

    assert.equal(requestIds.size, 1);
    assert.equal([...requestIds][0], 'req-homi-freeze-chain');
  } finally {
    stack.restore();
  }
});

test('the JSON body parser of the canonical application runs before the Homi route', () => {
  const indexSource = readSource('backend/index.js');

  const parserPosition = indexSource.indexOf('express.json()');
  const homiMountPosition = indexSource.indexOf("app.use('/api/homi'");
  const envelopePosition = indexSource.indexOf('errorEnvelopeMiddleware');

  assert.ok(parserPosition >= 0);
  assert.ok(parserPosition < homiMountPosition, 'an oversized body fails at the canonical parser');
  assert.ok(envelopePosition >= 0 && envelopePosition < parserPosition, 'the parser failure uses the canonical envelope');
});

// ---------------------------------------------------------------------------
// 13. The frozen error taxonomy (S17)
// ---------------------------------------------------------------------------

const FROZEN_TAXONOMY = Object.freeze([
  ['HOMI_REQUEST_INVALID', 400],
  ['HOMI_AUTH_CONTEXT_INVALID', 401],
  ['HOMI_CONTEXT_UNAVAILABLE', 403],
  ['HOMI_CLAIM_INVALID', 400],
  ['HOMI_CONTEXT_MISMATCH', 403],
  ['HOMI_TOOL_NOT_FOUND', 404],
  ['HOMI_TOOL_NOT_READ', 400],
  ['HOMI_TOOL_ARGUMENT_INVALID', 400],
  ['HOMI_TOOL_BINDING_MISSING', 500],
  ['HOMI_TOOL_EXECUTION_FAILED', 500],
]);

test('the frozen Homi error taxonomy is exactly the ten canonical codes', () => {
  const frozen = FROZEN_TAXONOMY.map(([code]) => code).sort();

  const declared = new Set([
    ...Object.keys(HOMI_ERROR_STATUS),
    'HOMI_REQUEST_INVALID',
  ]);

  assert.deepEqual([...declared].sort(), frozen);
});

test('the frozen Homi error taxonomy keeps its canonical status', () => {
  for (const [code, status] of FROZEN_TAXONOMY) {
    if (code === 'HOMI_REQUEST_INVALID') continue;

    assert.equal(HOMI_ERROR_STATUS[code], status, code);
  }
});

test('every frozen Homi code is produced by its own scenario', async () => {
  const produced = new Set();

  // HOMI_AUTH_CONTEXT_INVALID
  {
    const { executor } = createExecutor();
    await executor(buildInvocation({ accessToken: '' })).catch((error) => produced.add(error.code));
  }

  // HOMI_CONTEXT_UNAVAILABLE
  {
    const resolver = createContextResolverDouble();
    resolver.resolveExecutionContext = async () => ({
      context: { actorId: PERSON_A },
      canonical: buildCanonicalContext(),
    });

    const { executor } = createExecutor({ resolver });
    await executor(buildInvocation()).catch((error) => produced.add(error.code));
  }

  // HOMI_CLAIM_INVALID
  {
    const { executor } = createExecutor();
    await executor(buildInvocation({ claims: { actor_id: PERSON_A } })).catch((error) =>
      produced.add(error.code)
    );
  }

  // HOMI_CONTEXT_MISMATCH
  {
    const { executor } = createExecutor();
    await executor(
      buildInvocation({ claims: { actor_id: PERSON_B, household_id: HOUSEHOLD_H1 } })
    ).catch((error) => produced.add(error.code));
  }

  // HOMI_TOOL_NOT_FOUND
  {
    const { executor } = createExecutor();
    await executor(buildInvocation({ toolId: 'planner.fake.whatever' })).catch((error) =>
      produced.add(error.code)
    );
  }

  // HOMI_TOOL_NOT_READ
  {
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

    const { executor } = createExecutor({ registry });
    await executor(buildInvocation({ toolId: 'planner.synthetic.write' })).catch((error) =>
      produced.add(error.code)
    );
  }

  // HOMI_TOOL_ARGUMENT_INVALID
  {
    const { executor } = createExecutor();
    await executor(buildInvocation({ toolId: 'planner.tasks.get', args: {} })).catch((error) =>
      produced.add(error.code)
    );
  }

  // HOMI_TOOL_BINDING_MISSING
  {
    const { executor } = createExecutor({ bindings: createToolBindings({}) });
    await executor(buildInvocation()).catch((error) => produced.add(error.code));
  }

  // HOMI_TOOL_EXECUTION_FAILED
  {
    const { executor } = createExecutor({
      bindings: createToolBindings({
        'planner.tasks.list': async () => {
          throw new Error('unexpected internal failure');
        },
      }),
    });
    await executor(buildInvocation()).catch((error) => produced.add(error.code));
  }

  // HOMI_REQUEST_INVALID
  {
    const stack = loadHomiHttpStack({
      bindings: createToolBindings({ 'planner.tasks.list': async () => ({ tasks: [] }) }),
    });

    try {
      const req = createRequest({ body: { actor_id: PERSON_A } });
      const response = createResponse(req);

      await stack.controller.invokeTool(req, response);

      produced.add(response.body.error.code);
    } finally {
      stack.restore();
    }
  }

  assert.deepEqual(
    [...produced].sort(),
    FROZEN_TAXONOMY.map(([code]) => code).sort()
  );
});

// ---------------------------------------------------------------------------
// 14. The absence of a direct data access (S18)
// ---------------------------------------------------------------------------

test('the Homi execution tree never reaches the data layer directly', () => {
  const forbidden = [
    [/supabaseAdmin/i, 'no service client'],
    [/\bcreateClient\b/, 'no data client'],
    [/\bfrom\(['"]pg['"]\)/, 'no postgres driver'],
    [/prisma/i, 'no ORM'],
    [/\bsupabase\b/i, 'no data client'],
    [/\.rpc\s*\(/, 'no remote procedure'],
    [/\bfetch\s*\(/, 'no network'],
    [/\baxios\b/, 'no network'],
    [/\/api\/planner/, 'no internal Planner call'],
  ];

  for (const absolutePath of listHomiProductionSources()) {
    const relativePath = relativeOf(absolutePath);
    const source = readSourceCode(relativePath);

    for (const [pattern, reason] of forbidden) {
      assert.doesNotMatch(source, pattern, `${relativePath} must not use ${reason}`);
    }
  }
});

test('the Homi execution tree embeds no SQL', () => {
  for (const absolutePath of listHomiProductionSources()) {
    const relativePath = relativeOf(absolutePath);
    const source = readSourceCode(relativePath);

    assert.doesNotMatch(source, /\bselect\b[\s\S]*\bfrom\b/i, `${relativePath} must not embed SQL`);
    assert.doesNotMatch(source, /\binsert\s+into\b/i, `${relativePath} must not embed SQL`);
    assert.doesNotMatch(source, /\bdelete\s+from\b/i, `${relativePath} must not embed SQL`);
    assert.doesNotMatch(source, /\bupdate\b[\s\S]*\bset\b/i, `${relativePath} must not embed SQL`);
  }
});

test('the Homi modules never import a Planner controller or a Planner route', () => {
  for (const absolutePath of listHomiProductionSources()) {
    const relativePath = relativeOf(absolutePath);
    const source = readSourceCode(relativePath);

    assert.doesNotMatch(source, /controllers\/planner/, `${relativePath} must not import a Planner controller`);
    assert.doesNotMatch(source, /routes\/planner/, `${relativePath} must not import a Planner route`);
  }
});
