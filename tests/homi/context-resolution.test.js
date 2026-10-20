'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  HOMI_CONTEXT_FIELDS,
  HOMI_CLAIM_FIELDS,
  HOMI_AUTH_CONTEXT_INVALID,
  HOMI_CONTEXT_UNAVAILABLE,
  HOMI_CONTEXT_MISMATCH,
  HOMI_CLAIM_INVALID,
  HomiContextError,
  createHomiContextResolver,
  createHomiToolRegistry,
  defaultResolveHomePlusContext,
  resolveHomiContext,
  validateHomiIdentityClaims,
} = require('../../backend/src/homi');

const repositoryRoot = path.join(__dirname, '..', '..');

const AUTH_USER_ID = 'auth-user-11111111';
const ACCESS_TOKEN = 'header.payload.signature-access-token-value';
const PERSON_ID = 'person-22222222';
const HOUSEHOLD_ID = 'household-33333333';
const MEMBERSHIP_ID = 'membership-44444444';
const ROLE = 'owner';

function buildCanonicalContext(overrides) {
  return Object.assign(
    {
      client: { marker: 'canonical-client-must-not-leak' },
      accountId: AUTH_USER_ID,
      person: {
        id: PERSON_ID,
        auth_user_id: AUTH_USER_ID,
        active_household_id: HOUSEHOLD_ID,
      },
      household: { id: HOUSEHOLD_ID },
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

function buildAuthInput(overrides) {
  return Object.assign(
    {
      user: { id: AUTH_USER_ID },
      accessToken: ACCESS_TOKEN,
    },
    overrides || {}
  );
}

function createRecordingResolver(canonicalOrError) {
  const calls = [];
  const resolveHomePlusContext = async (input) => {
    calls.push(input);
    if (canonicalOrError instanceof Error) throw canonicalOrError;
    return canonicalOrError;
  };

  return { resolver: createHomiContextResolver({ resolveHomePlusContext }), calls };
}

async function assertHomiError(promise, expectedCode) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof HomiContextError, 'expected a HomiContextError');
    assert.equal(error.code, expectedCode);
    return true;
  });
}

function assertNoTokenLeak(error, token) {
  assert.ok(!String(error.message).includes(token), 'the error message must not leak the token');
  assert.ok(
    !JSON.stringify(error.details || {}).includes(token),
    'the error details must not leak the token'
  );
  assert.ok(
    !JSON.stringify(error).includes(token),
    'the serialized error must not leak the token'
  );
}

// ── 1..6: valid resolution and canonical identity mapping ───────────────────

test('valid authenticated input resolves an authoritative Homi context', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());

  const context = await resolver(buildAuthInput());

  assert.ok(context);
  assert.equal(typeof context, 'object');
});

test('actorId maps from the canonical HomePlus person', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());

  const context = await resolver(buildAuthInput());

  assert.equal(context.actorId, PERSON_ID);
});

test('householdId maps from the authoritative active household', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());

  const context = await resolver(buildAuthInput());

  assert.equal(context.householdId, HOUSEHOLD_ID);
});

test('membershipId is derived from the active household membership', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());

  const context = await resolver(buildAuthInput());

  assert.equal(context.membershipId, MEMBERSHIP_ID);
});

test('role is derived from the active membership', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());

  const context = await resolver(buildAuthInput());

  assert.equal(context.role, ROLE);
});

test('authUserId comes from the authenticated user id', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());

  const context = await resolver(buildAuthInput());

  assert.equal(context.authUserId, AUTH_USER_ID);
});

// ── 7..11: authenticated input validation ────────────────────────────────────

test('a missing user is rejected', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());

  await assertHomiError(
    resolver({ accessToken: ACCESS_TOKEN }),
    HOMI_AUTH_CONTEXT_INVALID
  );
});

test('a missing user id is rejected', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());

  await assertHomiError(
    resolver({ user: {}, accessToken: ACCESS_TOKEN }),
    HOMI_AUTH_CONTEXT_INVALID
  );
});

test('a blank user id is rejected', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());

  await assertHomiError(
    resolver({ user: { id: '   ' }, accessToken: ACCESS_TOKEN }),
    HOMI_AUTH_CONTEXT_INVALID
  );
});

test('a missing access token is rejected', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());

  await assertHomiError(resolver({ user: { id: AUTH_USER_ID } }), HOMI_AUTH_CONTEXT_INVALID);
});

test('a blank access token is rejected', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());

  await assertHomiError(
    resolver({ user: { id: AUTH_USER_ID }, accessToken: '   ' }),
    HOMI_AUTH_CONTEXT_INVALID
  );
});

// ── 12..16: incomplete or inconsistent canonical context ────────────────────

test('an incomplete canonical HomePlus context is rejected', async () => {
  const { resolver } = createRecordingResolver({});

  await assertHomiError(resolver(buildAuthInput()), HOMI_CONTEXT_UNAVAILABLE);
});

test('a canonical context without person is rejected', async () => {
  const { resolver } = createRecordingResolver(
    buildCanonicalContext({ person: null, personId: null })
  );

  await assertHomiError(resolver(buildAuthInput()), HOMI_CONTEXT_UNAVAILABLE);
});

test('a canonical context without household is rejected', async () => {
  const { resolver } = createRecordingResolver(
    buildCanonicalContext({ household: null, householdId: null })
  );

  await assertHomiError(resolver(buildAuthInput()), HOMI_CONTEXT_UNAVAILABLE);
});

test('a canonical context without membership is rejected', async () => {
  const { resolver } = createRecordingResolver(
    buildCanonicalContext({ membership: null, membershipId: null })
  );

  await assertHomiError(resolver(buildAuthInput()), HOMI_CONTEXT_UNAVAILABLE);
});

test('a canonical context without role is rejected', async () => {
  const { resolver } = createRecordingResolver(
    buildCanonicalContext({ membership: { id: MEMBERSHIP_ID, status: 'active' }, role: null })
  );

  await assertHomiError(resolver(buildAuthInput()), HOMI_CONTEXT_UNAVAILABLE);
});

test('a canonical context with a non active membership is rejected', async () => {
  const { resolver } = createRecordingResolver(
    buildCanonicalContext({ membershipStatus: 'inactive' })
  );

  await assertHomiError(resolver(buildAuthInput()), HOMI_CONTEXT_UNAVAILABLE);
});

test('a canonical context bound to another authenticated user is rejected', async () => {
  const { resolver } = createRecordingResolver(
    buildCanonicalContext({ accountId: 'auth-user-99999999' })
  );

  await assertHomiError(resolver(buildAuthInput()), HOMI_CONTEXT_UNAVAILABLE);
});

// ── 17..20: result shape and immutability ───────────────────────────────────

test('the resolved context contains exactly the intended fields', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());

  const context = await resolver(buildAuthInput());

  assert.deepEqual(Object.keys(context).sort(), [...HOMI_CONTEXT_FIELDS].sort());
  assert.deepEqual([...HOMI_CONTEXT_FIELDS].sort(), [
    'actorId',
    'authUserId',
    'householdId',
    'membershipId',
    'role',
  ]);
});

test('the resolved context exposes no access token', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());

  const context = await resolver(buildAuthInput());

  assert.ok(!JSON.stringify(context).includes(ACCESS_TOKEN));
  assert.equal(context.accessToken, undefined);
  assert.equal(context.token, undefined);
  assert.equal(context.refreshToken, undefined);
});

test('the resolved context exposes no client, credential or raw row', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());

  const context = await resolver(buildAuthInput());

  assert.equal(context.client, undefined);
  assert.equal(context.person, undefined);
  assert.equal(context.household, undefined);
  assert.equal(context.membership, undefined);
  assert.equal(context.supabase, undefined);
  assert.equal(context.serviceRoleKey, undefined);
  assert.ok(!JSON.stringify(context).includes('canonical-client-must-not-leak'));

  for (const field of HOMI_CONTEXT_FIELDS) {
    assert.equal(typeof context[field], 'string');
    assert.ok(context[field].trim().length > 0);
  }
});

test('the resolved context is immutable', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());

  const context = await resolver(buildAuthInput());

  assert.ok(Object.isFrozen(context));
  assert.throws(() => {
    context.actorId = 'attacker-actor';
  }, TypeError);
  assert.throws(() => {
    context.householdId = 'attacker-household';
  }, TypeError);
  assert.throws(() => {
    context.membershipId = 'attacker-membership';
  }, TypeError);
  assert.throws(() => {
    context.authUserId = 'attacker-auth-user';
  }, TypeError);
  assert.throws(() => {
    context.role = 'admin';
  }, TypeError);

  assert.equal(context.actorId, PERSON_ID);
  assert.equal(context.householdId, HOUSEHOLD_ID);
  assert.equal(context.membershipId, MEMBERSHIP_ID);
  assert.equal(context.authUserId, AUTH_USER_ID);
  assert.equal(context.role, ROLE);
});

// ── 21..23: dependency boundary and caller authority ────────────────────────

test('the canonical dependency receives the authenticated access token', async () => {
  const { resolver, calls } = createRecordingResolver(buildCanonicalContext());

  await resolver(buildAuthInput());

  assert.equal(calls.length, 1);
  assert.equal(calls[0].accessToken, ACCESS_TOKEN);
  assert.equal(calls[0].user.id, AUTH_USER_ID);
});

test('the caller cannot supply actorId as resolver authority', async () => {
  const { resolver, calls } = createRecordingResolver(buildCanonicalContext());

  const context = await resolver(
    buildAuthInput({ actorId: 'attacker-actor', membershipId: 'attacker-membership' })
  );

  assert.equal(context.actorId, PERSON_ID);
  assert.equal(context.membershipId, MEMBERSHIP_ID);
  assert.equal(calls[0].actorId, undefined);
  assert.equal(calls[0].membershipId, undefined);
});

test('the caller cannot supply householdId as resolver authority', async () => {
  const { resolver, calls } = createRecordingResolver(buildCanonicalContext());

  const context = await resolver(
    buildAuthInput({ householdId: 'attacker-household', role: 'admin' })
  );

  assert.equal(context.householdId, HOUSEHOLD_ID);
  assert.equal(context.role, ROLE);
  assert.equal(calls[0].householdId, undefined);
  assert.equal(calls[0].role, undefined);
  assert.deepEqual(Object.keys(calls[0]).sort(), ['accessToken', 'user']);
});

// ── 24..35: external identity claim policy ──────────────────────────────────

test('matching external identity claims are accepted', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());
  const context = await resolver(buildAuthInput());

  const accepted = validateHomiIdentityClaims(
    { actor_id: PERSON_ID, household_id: HOUSEHOLD_ID },
    context
  );

  assert.equal(accepted, true);
});

test('an actor mismatch is rejected', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());
  const context = await resolver(buildAuthInput());

  await assertHomiError(
    Promise.resolve().then(() =>
      validateHomiIdentityClaims(
        { actor_id: 'other-actor', household_id: HOUSEHOLD_ID },
        context
      )
    ),
    HOMI_CONTEXT_MISMATCH
  );
});

test('a household mismatch is rejected', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());
  const context = await resolver(buildAuthInput());

  await assertHomiError(
    Promise.resolve().then(() =>
      validateHomiIdentityClaims(
        { actor_id: PERSON_ID, household_id: 'other-household' },
        context
      )
    ),
    HOMI_CONTEXT_MISMATCH
  );
});

test('a simultaneous actor and household mismatch is rejected', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());
  const context = await resolver(buildAuthInput());

  await assertHomiError(
    Promise.resolve().then(() =>
      validateHomiIdentityClaims(
        { actor_id: 'other-actor', household_id: 'other-household' },
        context
      )
    ),
    HOMI_CONTEXT_MISMATCH
  );
});

test('a missing actor_id claim is rejected', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());
  const context = await resolver(buildAuthInput());

  await assertHomiError(
    Promise.resolve().then(() =>
      validateHomiIdentityClaims({ household_id: HOUSEHOLD_ID }, context)
    ),
    HOMI_CLAIM_INVALID
  );
});

test('a missing household_id claim is rejected', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());
  const context = await resolver(buildAuthInput());

  await assertHomiError(
    Promise.resolve().then(() =>
      validateHomiIdentityClaims({ actor_id: PERSON_ID }, context)
    ),
    HOMI_CLAIM_INVALID
  );
});

test('blank identity claims are rejected', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());
  const context = await resolver(buildAuthInput());

  await assertHomiError(
    Promise.resolve().then(() =>
      validateHomiIdentityClaims({ actor_id: '   ', household_id: HOUSEHOLD_ID }, context)
    ),
    HOMI_CLAIM_INVALID
  );

  await assertHomiError(
    Promise.resolve().then(() =>
      validateHomiIdentityClaims({ actor_id: PERSON_ID, household_id: '  ' }, context)
    ),
    HOMI_CLAIM_INVALID
  );
});

test('non string identity claims are rejected', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());
  const context = await resolver(buildAuthInput());

  await assertHomiError(
    Promise.resolve().then(() =>
      validateHomiIdentityClaims({ actor_id: 42, household_id: HOUSEHOLD_ID }, context)
    ),
    HOMI_CLAIM_INVALID
  );

  await assertHomiError(
    Promise.resolve().then(() =>
      validateHomiIdentityClaims({ actor_id: PERSON_ID, household_id: { id: HOUSEHOLD_ID } }, context)
    ),
    HOMI_CLAIM_INVALID
  );
});

test('a membership_id claim is rejected', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());
  const context = await resolver(buildAuthInput());

  await assertHomiError(
    Promise.resolve().then(() =>
      validateHomiIdentityClaims(
        {
          actor_id: PERSON_ID,
          household_id: HOUSEHOLD_ID,
          membership_id: MEMBERSHIP_ID,
        },
        context
      )
    ),
    HOMI_CLAIM_INVALID
  );
});

test('a role claim is rejected', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());
  const context = await resolver(buildAuthInput());

  await assertHomiError(
    Promise.resolve().then(() =>
      validateHomiIdentityClaims(
        { actor_id: PERSON_ID, household_id: HOUSEHOLD_ID, role: 'admin' },
        context
      )
    ),
    HOMI_CLAIM_INVALID
  );
});

test('an auth_user_id claim is rejected', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());
  const context = await resolver(buildAuthInput());

  await assertHomiError(
    Promise.resolve().then(() =>
      validateHomiIdentityClaims(
        {
          actor_id: PERSON_ID,
          household_id: HOUSEHOLD_ID,
          auth_user_id: AUTH_USER_ID,
        },
        context
      )
    ),
    HOMI_CLAIM_INVALID
  );
});

test('claim validation does not mutate its input', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());
  const context = await resolver(buildAuthInput());
  const claims = { actor_id: PERSON_ID, household_id: HOUSEHOLD_ID };
  const before = JSON.stringify(claims);

  validateHomiIdentityClaims(claims, context);

  assert.equal(JSON.stringify(claims), before);
  assert.deepEqual(Object.keys(claims).sort(), [...HOMI_CLAIM_FIELDS].sort());
  assert.equal(context.actorId, PERSON_ID);
  assert.equal(context.householdId, HOUSEHOLD_ID);
});

// ── 36..37: error safety ────────────────────────────────────────────────────

test('context errors never leak the access token', async () => {
  const { resolver } = createRecordingResolver(buildCanonicalContext());

  await assert.rejects(
    resolver({ user: { id: AUTH_USER_ID }, accessToken: '   ' }),
    (error) => {
      assert.equal(error.code, HOMI_AUTH_CONTEXT_INVALID);
      assertNoTokenLeak(error, ACCESS_TOKEN);
      return true;
    }
  );
});

test('a canonical dependency failure is mapped safely without token leakage', async () => {
  const { resolver } = createRecordingResolver(
    new Error(`canonical authority failed for token ${ACCESS_TOKEN}`)
  );

  await assert.rejects(resolver(buildAuthInput()), (error) => {
    assert.ok(error instanceof HomiContextError);
    assert.equal(error.code, HOMI_CONTEXT_UNAVAILABLE);
    assertNoTokenLeak(error, ACCESS_TOKEN);
    assert.ok(error.cause instanceof Error, 'the original cause is preserved internally');
    return true;
  });
});

// ── 38: production wiring ───────────────────────────────────────────────────

test('the default production resolver is wired to the canonical HomePlus context authority', async () => {
  const canonicalModulePath = path.join(
    repositoryRoot,
    'backend',
    'src',
    'services',
    'planner.context.service.js'
  );

  assert.ok(fs.existsSync(canonicalModulePath), 'the canonical context authority must exist');
  assert.match(
    fs.readFileSync(canonicalModulePath, 'utf8'),
    /getPlannerContext/,
    'the canonical context authority must expose the canonical resolver'
  );

  const received = [];
  const fakeCanonicalModule = {
    getPlannerContext: async (request) => {
      received.push(request);
      return buildCanonicalContext();
    },
  };

  const previous = require.cache[canonicalModulePath];
  require.cache[canonicalModulePath] = {
    id: canonicalModulePath,
    filename: canonicalModulePath,
    loaded: true,
    exports: fakeCanonicalModule,
    children: [],
    paths: [],
  };

  try {
    const context = await resolveHomiContext(buildAuthInput());

    assert.equal(context.actorId, PERSON_ID);
    assert.equal(context.householdId, HOUSEHOLD_ID);
    assert.equal(context.membershipId, MEMBERSHIP_ID);
    assert.equal(context.authUserId, AUTH_USER_ID);
    assert.equal(context.role, ROLE);

    assert.equal(received.length, 1);
    assert.equal(received[0].accessToken, ACCESS_TOKEN);
    assert.equal(received[0].user.id, AUTH_USER_ID);

    assert.equal(typeof defaultResolveHomePlusContext, 'function');
  } finally {
    if (previous === undefined) {
      delete require.cache[canonicalModulePath];
    } else {
      require.cache[canonicalModulePath] = previous;
    }
  }
});

// ── 20: no business execution ───────────────────────────────────────────────

test('the Homi context boundary exposes no business execution', () => {
  const registry = createHomiToolRegistry();
  assert.equal(registry.size, 0);
  assert.deepEqual(registry.list(), []);

  const surface = Object.keys(require('../../backend/src/homi'));
  assert.equal(surface.includes('executeTool'), false);
  assert.equal(surface.includes('runTool'), false);
  assert.equal(surface.includes('invokeTool'), false);

  const resolverSource = fs.readFileSync(
    path.join(repositoryRoot, 'backend', 'src', 'homi', 'contextResolver.js'),
    'utf8'
  );
  assert.doesNotMatch(resolverSource, /planner\.tasks|finance|homecloud|inventory|presence/i);
  assert.doesNotMatch(resolverSource, /\b(select|insert|update|delete)\b\s+(into|from|set)\b/i);
});
