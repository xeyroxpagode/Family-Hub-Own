'use strict';

/**
 * HomePlus Homi Tool Layer — HTTP surface tests (T07-S4).
 *
 * These tests cover the first Homi HTTP surface:
 *   - the mount point and the shape of the route;
 *   - the protection of the route by the canonical authentication
 *     middleware;
 *   - the exact accepted invocation body;
 *   - the deterministic failure of an unknown tool;
 *   - the thinness of the controller;
 *   - the canonical error envelope.
 *
 * No live database and no runtime dependency is required. The route wiring
 * is proven against the route source, exactly like the current Planner
 * traceability tests do, and the controller is exercised with a request and a
 * response double.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { errorEnvelopeMiddleware } = require('../../backend/src/middleware/errorEnvelopeMiddleware');
const { HOMI_TOOL_NOT_FOUND } = require('../../backend/src/homiRuntime/toolExecutor');

const repositoryRoot = path.join(__dirname, '..', '..');

const AUTH_USER_ID = 'auth-user-11111111';
const ACCESS_TOKEN = 'header.payload.signature-access-token-value';
const PERSON_ID = 'person-22222222';
const HOUSEHOLD_ID = 'household-33333333';

const INVOKE_PATH = '/tools/:toolId/invoke';

function readSource(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

/**
 * Read a source without its comments, so a prose sentence can never be
 * mistaken for a declaration.
 */
function readSourceCode(relativePath) {
  return readSource(relativePath)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// ---------------------------------------------------------------------------
// Request and response doubles
// ---------------------------------------------------------------------------

/**
 * A response double wired with the canonical error envelope middleware, so
 * the produced payload is exactly the one a real HomePlus response carries.
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

  errorEnvelopeMiddleware(req, response, () => {});

  return response;
}

function createRequest(overrides) {
  return Object.assign(
    {
      params: { toolId: 'planner.tasks.list' },
      body: {
        actor_id: PERSON_ID,
        household_id: HOUSEHOLD_ID,
        args: {},
      },
      headers: { authorization: `Bearer ${ACCESS_TOKEN}` },
      user: { id: AUTH_USER_ID },
      accessToken: ACCESS_TOKEN,
      requestId: 'req-homi-http-1',
    },
    overrides || {}
  );
}

/**
 * Load the controller with a given executor.
 *
 * The executor module is replaced through the module cache, exactly like the
 * current Homi context tests replace the canonical context authority.
 */
function loadControllerWithExecutor(executorDouble) {
  const executorPath = require.resolve('../../backend/src/homiRuntime/toolExecutor');
  const controllerPath = require.resolve('../../backend/src/controllers/homi.controller');

  const previousExecutor = require.cache[executorPath];
  const previousController = require.cache[controllerPath];

  require.cache[executorPath] = {
    id: executorPath,
    filename: executorPath,
    loaded: true,
    exports: executorDouble,
    children: [],
    paths: [],
  };
  delete require.cache[controllerPath];

  const controller = require(controllerPath);

  return {
    controller,
    restore() {
      if (previousExecutor === undefined) {
        delete require.cache[executorPath];
      } else {
        require.cache[executorPath] = previousExecutor;
      }

      if (previousController === undefined) {
        delete require.cache[controllerPath];
      } else {
        require.cache[controllerPath] = previousController;
      }
    },
  };
}

/**
 * Load the whole chain with a fake canonical context resolver, so the real
 * executor runs without any runtime dependency.
 */
function loadControllerWithRealExecutor() {
  const resolverPath = require.resolve('../../backend/src/homi/contextResolver');
  const executorPath = require.resolve('../../backend/src/homiRuntime/toolExecutor');
  const controllerPath = require.resolve('../../backend/src/controllers/homi.controller');

  const previousResolver = require.cache[resolverPath];
  const previousExecutor = require.cache[executorPath];
  const previousController = require.cache[controllerPath];

  const realResolver = previousResolver ? previousResolver.exports : require(resolverPath);

  require.cache[resolverPath] = {
    id: resolverPath,
    filename: resolverPath,
    loaded: true,
    exports: Object.assign({}, realResolver, {
      resolveHomiExecutionContext: async () => ({
        context: {
          actorId: PERSON_ID,
          householdId: HOUSEHOLD_ID,
          membershipId: 'membership-44444444',
          authUserId: AUTH_USER_ID,
          role: 'coordinator',
        },
        canonical: { householdId: HOUSEHOLD_ID, personId: PERSON_ID },
      }),
    }),
    children: [],
    paths: [],
  };
  delete require.cache[executorPath];
  delete require.cache[controllerPath];

  const controller = require(controllerPath);

  return {
    controller,
    restore() {
      if (previousResolver === undefined) {
        delete require.cache[resolverPath];
      } else {
        require.cache[resolverPath] = previousResolver;
      }
      if (previousExecutor === undefined) {
        delete require.cache[executorPath];
      } else {
        require.cache[executorPath] = previousExecutor;
      }
      if (previousController === undefined) {
        delete require.cache[controllerPath];
      } else {
        require.cache[controllerPath] = previousController;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// 1..3: the route
// ---------------------------------------------------------------------------

test('the Homi router is mounted under /api/homi', () => {
  const indexSource = readSource('backend/index.js');

  assert.ok(indexSource.includes("require('./src/routes/homi')"), 'the route module must be imported');
  assert.ok(indexSource.includes("app.use('/api/homi', homiRoutes);"), 'the router must be mounted');
});

test('the Homi router is mounted after the canonical global middleware', () => {
  const indexSource = readSource('backend/index.js');

  const requestContextPosition = indexSource.indexOf('requestContextMiddleware');
  const errorEnvelopePosition = indexSource.indexOf('errorEnvelopeMiddleware');
  const homiMountPosition = indexSource.indexOf("app.use('/api/homi'");

  assert.ok(requestContextPosition >= 0 && requestContextPosition < homiMountPosition);
  assert.ok(errorEnvelopePosition >= 0 && errorEnvelopePosition < homiMountPosition);
});

test('the invoke route is POST only', () => {
  const routeSource = readSource('backend/src/routes/homi.js');

  assert.ok(routeSource.includes('router.post('), 'the invoke route must be a POST');
  assert.doesNotMatch(routeSource, /router\.(get|put|patch|delete)\s*\(/, 'no other verb is exposed');
});

test('the invoke route is protected by the canonical authentication middleware', () => {
  const routeSource = readSource('backend/src/routes/homi.js');

  assert.ok(
    routeSource.includes("require('../middleware/authFinalMiddleware')"),
    'the canonical authentication middleware must be used'
  );

  const middlewarePosition = routeSource.indexOf('router.use(authFinalMiddleware)');
  const routePosition = routeSource.indexOf('router.post(');

  assert.ok(middlewarePosition >= 0, 'the middleware must protect the router');
  assert.ok(middlewarePosition < routePosition, 'the middleware must run before the route');
});

test('the Homi surface declares no second token parser and no login', () => {
  const routeSource = readSourceCode('backend/src/routes/homi.js');

  assert.doesNotMatch(routeSource, /jwt/i, 'the Homi surface must not parse a token');
  assert.doesNotMatch(routeSource, /service[_-]?role/i, 'no service role credential is accepted');
  assert.doesNotMatch(routeSource, /login|sign[_-]?in/i, 'the Homi surface has no login');
  assert.doesNotMatch(routeSource, /auth\.service/, 'the Homi surface must not parse the token itself');
});

test('the invoke path is the canonical tool invocation path', () => {
  const { HOMI_TOOL_INVOKE_PATH } = require('../../backend/src/controllers/homi.controller');

  assert.equal(HOMI_TOOL_INVOKE_PATH, INVOKE_PATH);
});

// ---------------------------------------------------------------------------
// 4..8: the invocation body and the executor hand off
// ---------------------------------------------------------------------------

test('a missing identity claim is rejected', async () => {
  const executorDouble = { executeHomiTool: async () => ({ ok: true }) };
  const { controller, restore } = loadControllerWithExecutor(executorDouble);

  try {
    const req = createRequest({
      body: { household_id: HOUSEHOLD_ID, args: {} },
    });
    const res = createResponse(req);

    await controller.invokeTool(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'HOMI_REQUEST_INVALID');
  } finally {
    restore();
  }
});

test('a missing identity claim never reaches the executor', async () => {
  const calls = [];
  const executorDouble = {
    executeHomiTool: async (input) => {
      calls.push(input);
      return { ok: true };
    },
  };
  const { controller, restore } = loadControllerWithExecutor(executorDouble);

  try {
    const req = createRequest({ body: { actor_id: PERSON_ID, args: {} } });
    const res = createResponse(req);

    await controller.invokeTool(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(calls.length, 0);
  } finally {
    restore();
  }
});

test('an extra top level request field is rejected', async () => {
  const calls = [];
  const executorDouble = {
    executeHomiTool: async (input) => {
      calls.push(input);
      return { ok: true };
    },
  };
  const { controller, restore } = loadControllerWithExecutor(executorDouble);

  try {
    const req = createRequest({
      body: {
        actor_id: PERSON_ID,
        household_id: HOUSEHOLD_ID,
        args: {},
        extra: 'nope',
      },
    });
    const res = createResponse(req);

    await controller.invokeTool(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'HOMI_REQUEST_INVALID');
    assert.equal(calls.length, 0);
  } finally {
    restore();
  }
});

test('no privileged field is accepted in the invocation body', async () => {
  const forbiddenFields = [
    'membership_id',
    'role',
    'auth_user_id',
    'access_token',
    'jwt',
    'token',
    'user_id',
    'person_id',
  ];

  for (const field of forbiddenFields) {
    const calls = [];
    const executorDouble = {
      executeHomiTool: async (input) => {
        calls.push(input);
        return { ok: true };
      },
    };
    const { controller, restore } = loadControllerWithExecutor(executorDouble);

    try {
      const req = createRequest({
        body: {
          actor_id: PERSON_ID,
          household_id: HOUSEHOLD_ID,
          args: {},
          [field]: 'nope',
        },
      });
      const res = createResponse(req);

      await controller.invokeTool(req, res);

      assert.equal(res.statusCode, 400, `"${field}" must be rejected`);
      assert.equal(res.body.error.code, 'HOMI_REQUEST_INVALID');
      assert.equal(calls.length, 0);
    } finally {
      restore();
    }
  }
});

test('a malformed args payload is rejected', async () => {
  const calls = [];
  const executorDouble = {
    executeHomiTool: async (input) => {
      calls.push(input);
      return { ok: true };
    },
  };
  const { controller, restore } = loadControllerWithExecutor(executorDouble);

  try {
    for (const args of ['not-an-object', 42, null, []]) {
      const req = createRequest({
        body: { actor_id: PERSON_ID, household_id: HOUSEHOLD_ID, args },
      });
      const res = createResponse(req);

      await controller.invokeTool(req, res);

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.error.code, 'HOMI_REQUEST_INVALID');
    }

    assert.equal(calls.length, 0);
  } finally {
    restore();
  }
});

test('a valid invocation reaches the executor with the canonical hand off', async () => {
  const calls = [];
  const executorDouble = {
    executeHomiTool: async (input) => {
      calls.push(input);
      return { ok: true, tool_id: input.toolId, result: { tasks: [] } };
    },
  };
  const { controller, restore } = loadControllerWithExecutor(executorDouble);

  try {
    const req = createRequest({
      params: { toolId: 'planner.tasks.list' },
      body: {
        actor_id: PERSON_ID,
        household_id: HOUSEHOLD_ID,
        args: { status: 'pending' },
      },
    });
    const res = createResponse(req);

    await controller.invokeTool(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      ok: true,
      tool_id: 'planner.tasks.list',
      result: { tasks: [] },
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].toolId, 'planner.tasks.list');
    assert.deepEqual(calls[0].claims, {
      actor_id: PERSON_ID,
      household_id: HOUSEHOLD_ID,
    });
    assert.deepEqual(calls[0].args, { status: 'pending' });
    assert.equal(calls[0].user.id, AUTH_USER_ID);
    assert.equal(calls[0].accessToken, ACCESS_TOKEN);
    assert.equal(calls[0].requestId, 'req-homi-http-1');
  } finally {
    restore();
  }
});

test('the controller never sends the access token back to the caller', async () => {
  const executorDouble = {
    executeHomiTool: async () => ({ ok: true, tool_id: 'planner.tasks.list', result: { tasks: [] } }),
  };
  const { controller, restore } = loadControllerWithExecutor(executorDouble);

  try {
    const req = createRequest();
    const res = createResponse(req);

    await controller.invokeTool(req, res);

    assert.ok(!JSON.stringify(res.body).includes(ACCESS_TOKEN));
    assert.equal(res.body.accessToken, undefined);
  } finally {
    restore();
  }
});

test('an unknown tool is rejected deterministically through the HTTP surface', async () => {
  const { controller, restore } = loadControllerWithRealExecutor();

  try {
    const req = createRequest({ params: { toolId: 'planner.fake.whatever' } });
    const res = createResponse(req);

    await controller.invokeTool(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.error.code, HOMI_TOOL_NOT_FOUND);
    assert.equal(res.body.error.request_id, 'req-homi-http-1');
  } finally {
    restore();
  }
});

test('an invalid argument is rejected through the HTTP surface', async () => {
  const { controller, restore } = loadControllerWithRealExecutor();

  try {
    const req = createRequest({
      params: { toolId: 'planner.summary.get' },
      body: {
        actor_id: PERSON_ID,
        household_id: HOUSEHOLD_ID,
        args: { foo: 'bar' },
      },
    });
    const res = createResponse(req);

    await controller.invokeTool(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, 'HOMI_TOOL_ARGUMENT_INVALID');
  } finally {
    restore();
  }
});

test('an identity mismatch is rejected through the HTTP surface', async () => {
  const { controller, restore } = loadControllerWithRealExecutor();

  try {
    const req = createRequest({
      body: {
        actor_id: 'someone-else',
        household_id: HOUSEHOLD_ID,
        args: {},
      },
    });
    const res = createResponse(req);

    await controller.invokeTool(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error.code, 'HOMI_CONTEXT_MISMATCH');
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// 9..10: the controller contract
// ---------------------------------------------------------------------------

test('the controller carries no Planner business logic', () => {
  const controllerSource = readSource('backend/src/controllers/homi.controller.js');

  const specifiers = Array.from(
    controllerSource.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)
  ).map((match) => match[1]);

  for (const specifier of specifiers) {
    assert.doesNotMatch(
      specifier,
      /planner|service|controller|routes/i,
      `the controller must not require "${specifier}"`
    );
  }

  assert.doesNotMatch(controllerSource, /planner\./i, 'the controller must not name a Planner operation');
  assert.doesNotMatch(controllerSource, /\.from\(/, 'the controller must not query any data source');
  assert.doesNotMatch(controllerSource, /\.rpc\s*\(/, 'the controller must not invoke a remote procedure');
  assert.doesNotMatch(controllerSource, /\b(fetch|axios)\b/, 'the controller must not call the network');
});

test('the controller resolves neither the authentication nor the context', () => {
  const controllerSource = readSource('backend/src/controllers/homi.controller.js');

  assert.doesNotMatch(controllerSource, /contextResolver/, 'the controller must not resolve the context');
  assert.doesNotMatch(controllerSource, /auth\.service|getAuthenticatedUser/, 'the controller must not authenticate');
  assert.doesNotMatch(controllerSource, /getPlannerContext/, 'the controller must not build a Planner context');
});

test('a canonical error flows through the existing error envelope', async () => {
  const executorDouble = {
    executeHomiTool: async () => {
      throw Object.assign(new Error('Tarea no encontrada.'), {
        statusCode: 404,
        code: 'task_not_found',
      });
    },
  };
  const { controller, restore } = loadControllerWithExecutor(executorDouble);

  try {
    const req = createRequest();
    const res = createResponse(req);

    await controller.invokeTool(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.error.code, 'task_not_found');
    assert.equal(res.body.error.message, 'Tarea no encontrada.');
    assert.equal(res.body.error.request_id, 'req-homi-http-1');
    assert.equal(res.headers['X-Request-Id'], 'req-homi-http-1');
  } finally {
    restore();
  }
});

test('an internal failure never leaks a stack or a token', async () => {
  const executorDouble = {
    executeHomiTool: async () => {
      throw new Error(`boom ${ACCESS_TOKEN}`);
    },
  };
  const { controller, restore } = loadControllerWithExecutor(executorDouble);

  try {
    const req = createRequest();
    const res = createResponse(req);

    await controller.invokeTool(req, res);

    assert.equal(res.statusCode, 500);
    assert.ok(!JSON.stringify(res.body).includes(ACCESS_TOKEN));
    assert.equal(res.body.error.message, 'Error interno.');
  } finally {
    restore();
  }
});
