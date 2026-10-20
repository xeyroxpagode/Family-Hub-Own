'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  HOMI_TOOL_CONTRACT_VERSION,
  TOOL_KINDS,
  TOOL_RISK_FLAGS,
  TOOL_CONFIRMATION,
  HOMI_TOOL_DEFINITION_INVALID,
  HOMI_TOOL_DUPLICATE,
  HomiToolError,
  validateToolDefinition,
  normalizeToolDefinition,
  HomiToolRegistry,
  createHomiToolRegistry,
} = require('../../backend/src/homi');

const repositoryRoot = path.join(__dirname, '..', '..');
const homiSourceDirectory = path.join(repositoryRoot, 'backend', 'src', 'homi');

function readHomiSource(fileName) {
  return fs.readFileSync(path.join(homiSourceDirectory, fileName), 'utf8');
}

function listHomiSources() {
  return fs
    .readdirSync(homiSourceDirectory)
    .filter((name) => name.endsWith('.js'))
    .sort();
}

function buildDefinition(overrides) {
  const definition = {
    contractVersion: HOMI_TOOL_CONTRACT_VERSION,
    id: 'planner.tasks.list',
    version: '1.0.0',
    domain: 'planner',
    description: 'List visible Planner tasks.',
    kind: 'READ',
    riskFlags: ['READ_ONLY'],
    confirmation: 'NEVER',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {},
      required: [],
    },
    outputSchema: {
      type: 'object',
    },
  };

  return Object.assign(definition, overrides || {});
}

function buildWriteDefinition(overrides) {
  return buildDefinition(
    Object.assign(
      {
        id: 'planner.tasks.update',
        domain: 'planner',
        description: 'Update a Planner task.',
        kind: 'WRITE',
        riskFlags: ['REVERSIBLE_MUTATION'],
        confirmation: 'NEVER',
      },
      overrides || {}
    )
  );
}

function assertInvalid(definition, expectedFragment) {
  assert.throws(
    () => validateToolDefinition(definition),
    (error) => {
      assert.ok(error instanceof HomiToolError, 'expected a HomiToolError');
      assert.equal(error.code, HOMI_TOOL_DEFINITION_INVALID);
      if (expectedFragment) {
        assert.ok(
          error.message.includes(expectedFragment),
          `expected "${error.message}" to mention "${expectedFragment}"`
        );
      }
      return true;
    }
  );
}

test('contract version, kinds, risk flags and confirmation values are canonical', () => {
  assert.equal(HOMI_TOOL_CONTRACT_VERSION, '1.0.0');
  assert.deepEqual(Array.from(TOOL_KINDS), ['READ', 'WRITE']);
  assert.deepEqual(Array.from(TOOL_RISK_FLAGS), [
    'READ_ONLY',
    'LOW_MUTATION',
    'REVERSIBLE_MUTATION',
    'DESTRUCTIVE',
    'SECURITY_SENSITIVE',
    'EXTERNAL_SIDE_EFFECT',
  ]);
  assert.deepEqual(Array.from(TOOL_CONFIRMATION), ['NEVER', 'REQUIRED']);
});

test('a valid READ tool definition is accepted', () => {
  const definition = buildDefinition();
  assert.equal(validateToolDefinition(definition), true);
  const normalized = normalizeToolDefinition(definition);
  assert.equal(normalized.id, 'planner.tasks.list');
  assert.equal(normalized.kind, 'READ');
  assert.deepEqual(normalized.riskFlags, ['READ_ONLY']);
});

test('a valid WRITE fixture is accepted by the contract validator', () => {
  const definition = buildWriteDefinition();
  assert.equal(validateToolDefinition(definition), true);
  assert.equal(normalizeToolDefinition(definition).kind, 'WRITE');
});

test('a malformed tool id is rejected', () => {
  assertInvalid(buildDefinition({ id: 'planner.tasks.list.extra/segment' }), 'id');
  assertInvalid(buildDefinition({ id: 'planner tasks list' }), 'id');
});

test('an uppercase tool id is rejected', () => {
  assertInvalid(buildDefinition({ id: 'Planner.tasks.list' }), 'id');
});

test('a tool id with too few segments is rejected', () => {
  assertInvalid(buildDefinition({ id: 'planner.tasks' }), 'id');
});

test('an invalid version is rejected', () => {
  assertInvalid(buildDefinition({ version: 'v1' }), 'version');
  assertInvalid(buildDefinition({ version: '1' }), 'version');
  assertInvalid(buildDefinition({ version: '1.0' }), 'version');
  assertInvalid(buildDefinition({ version: 'latest' }), 'version');
});

test('a domain that does not match the id prefix is rejected', () => {
  assertInvalid(buildDefinition({ domain: 'finance' }), 'domain');
});

test('a blank description is rejected', () => {
  assertInvalid(buildDefinition({ description: '' }), 'description');
  assertInvalid(buildDefinition({ description: '   ' }), 'description');
});

test('a description longer than 500 characters is rejected', () => {
  assertInvalid(buildDefinition({ description: 'a'.repeat(501) }), 'description');
});

test('an unknown top level field is rejected', () => {
  const definition = buildDefinition();
  definition.handler = () => 'nope';
  assertInvalid(definition, 'handler');
});

test('an invalid kind is rejected', () => {
  assertInvalid(buildDefinition({ kind: 'DELETE' }), 'kind');
});

test('an invalid risk flag is rejected', () => {
  assertInvalid(buildDefinition({ riskFlags: ['READ_ONLY', 'SUPER_SAFE'] }), 'riskFlags');
});

test('a duplicate risk flag is rejected', () => {
  assertInvalid(buildDefinition({ riskFlags: ['READ_ONLY', 'READ_ONLY'] }), 'riskFlags');
});

test('a READ tool without READ_ONLY is rejected', () => {
  assertInvalid(buildDefinition({ riskFlags: [] }), 'riskFlags');
});

test('a READ tool carrying a mutation risk flag is rejected', () => {
  assertInvalid(buildDefinition({ riskFlags: ['READ_ONLY', 'LOW_MUTATION'] }), 'riskFlags');
  assertInvalid(buildDefinition({ riskFlags: ['READ_ONLY', 'REVERSIBLE_MUTATION'] }), 'riskFlags');
  assertInvalid(buildDefinition({ riskFlags: ['READ_ONLY', 'DESTRUCTIVE'] }), 'riskFlags');
});

test('a WRITE tool carrying READ_ONLY is rejected', () => {
  assertInvalid(buildWriteDefinition({ riskFlags: ['READ_ONLY'] }), 'riskFlags');
});

test('a DESTRUCTIVE tool with confirmation NEVER is rejected', () => {
  assertInvalid(
    buildWriteDefinition({ riskFlags: ['DESTRUCTIVE'], confirmation: 'NEVER' }),
    'confirmation'
  );
});

test('a SECURITY_SENSITIVE tool with confirmation NEVER is rejected', () => {
  assertInvalid(
    buildWriteDefinition({ riskFlags: ['SECURITY_SENSITIVE'], confirmation: 'NEVER' }),
    'confirmation'
  );
});

test('a malformed inputSchema is rejected', () => {
  assertInvalid(buildDefinition({ inputSchema: { type: 'array', additionalProperties: false, properties: {}, required: [] } }), 'inputSchema');
  assertInvalid(buildDefinition({ inputSchema: { type: 'object', properties: {}, required: [] } }), 'additionalProperties');
  assertInvalid(buildDefinition({ inputSchema: { type: 'object', additionalProperties: true, properties: {}, required: [] } }), 'additionalProperties');
  assertInvalid(buildDefinition({ inputSchema: { type: 'object', additionalProperties: false, properties: [], required: [] } }), 'properties');
  assertInvalid(buildDefinition({ inputSchema: { type: 'object', additionalProperties: false, properties: {}, required: 'id' } }), 'required');
});

test('a required entry absent from properties is rejected', () => {
  assertInvalid(
    buildDefinition({
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: { taskId: { type: 'string' } },
        required: ['missing'],
      },
    }),
    'required'
  );
});

test('a duplicate required entry is rejected', () => {
  assertInvalid(
    buildDefinition({
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: { taskId: { type: 'string' } },
        required: ['taskId', 'taskId'],
      },
    }),
    'required'
  );
});

test('a function inside the schema is rejected', () => {
  const definition = buildDefinition();
  definition.inputSchema.properties.callback = () => 'nope';
  assertInvalid(definition, 'function');
});

test('undefined inside the schema is rejected', () => {
  const definition = buildDefinition();
  definition.inputSchema.properties.missing = undefined;
  assertInvalid(definition, 'undefined');
});

test('a cyclic definition is rejected', () => {
  const definition = buildDefinition();
  definition.inputSchema.properties.self = definition.inputSchema;
  assertInvalid(definition, 'cyclic');
});

test('validation does not mutate the caller input', () => {
  const definition = buildDefinition({
    riskFlags: ['READ_ONLY', 'EXTERNAL_SIDE_EFFECT'],
  });
  const before = JSON.stringify(definition);
  const riskFlagsBefore = definition.riskFlags;

  validateToolDefinition(definition);
  normalizeToolDefinition(definition);

  assert.equal(JSON.stringify(definition), before);
  assert.equal(definition.riskFlags, riskFlagsBefore);
});

test('a normalized definition is immutable', () => {
  const normalized = normalizeToolDefinition(buildDefinition());
  assert.ok(Object.isFrozen(normalized));
  assert.throws(() => {
    'use strict';
    normalized.id = 'finance.accounts.list';
  }, TypeError);
  assert.equal(normalized.id, 'planner.tasks.list');
});

test('a normalized nested schema is immutable', () => {
  const normalized = normalizeToolDefinition(
    buildDefinition({
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: { taskId: { type: 'string' } },
        required: ['taskId'],
      },
    })
  );

  assert.ok(Object.isFrozen(normalized.inputSchema));
  assert.ok(Object.isFrozen(normalized.inputSchema.properties));
  assert.ok(Object.isFrozen(normalized.inputSchema.properties.taskId));
  assert.ok(Object.isFrozen(normalized.riskFlags));
  assert.throws(() => {
    'use strict';
    normalized.inputSchema.properties.taskId.type = 'number';
  }, TypeError);
  assert.equal(normalized.inputSchema.properties.taskId.type, 'string');
});

test('the registry starts empty', () => {
  const registry = new HomiToolRegistry();
  assert.equal(registry.size, 0);
  assert.deepEqual(registry.list(), []);
  assert.equal(createHomiToolRegistry().size, 0);
});

test('the registry registers a tool and returns the canonical definition', () => {
  const registry = new HomiToolRegistry();
  const stored = registry.register(buildDefinition());
  assert.equal(stored.id, 'planner.tasks.list');
  assert.ok(Object.isFrozen(stored));
  assert.equal(registry.size, 1);
});

test('duplicate registration is rejected', () => {
  const registry = new HomiToolRegistry();
  registry.register(buildDefinition());
  assert.throws(
    () => registry.register(buildDefinition()),
    (error) => {
      assert.ok(error instanceof HomiToolError);
      assert.equal(error.code, HOMI_TOOL_DUPLICATE);
      return true;
    }
  );
  assert.equal(registry.size, 1);
});

test('get returns the canonical definition for a registered tool', () => {
  const registry = new HomiToolRegistry();
  registry.register(buildDefinition());
  const found = registry.get('planner.tasks.list');
  assert.ok(found);
  assert.equal(found.id, 'planner.tasks.list');
  assert.equal(found.kind, 'READ');
});

test('get returns null for an unknown tool', () => {
  const registry = new HomiToolRegistry();
  assert.equal(registry.get('planner.tasks.missing'), null);
  assert.equal(registry.get(undefined), null);
});

test('has reports registration state', () => {
  const registry = new HomiToolRegistry();
  assert.equal(registry.has('planner.tasks.list'), false);
  registry.register(buildDefinition());
  assert.equal(registry.has('planner.tasks.list'), true);
  assert.equal(registry.has('planner.tasks.missing'), false);
});

test('size reports the exact registry count', () => {
  const registry = new HomiToolRegistry();
  assert.equal(registry.size, 0);
  registry.register(buildDefinition());
  registry.register(buildWriteDefinition());
  assert.equal(registry.size, 2);
});

test('list is deterministic and sorted lexicographically by id', () => {
  const registry = new HomiToolRegistry();
  registry.register(buildDefinition({ id: 'planner.tasks.list', domain: 'planner' }));
  registry.register(buildWriteDefinition({ id: 'planner.tasks.update', domain: 'planner' }));
  registry.register(
    buildDefinition({ id: 'finance.accounts.list', domain: 'finance', description: 'List accounts.' })
  );

  const listed = registry.list().map((tool) => tool.id);
  assert.deepEqual(listed, ['finance.accounts.list', 'planner.tasks.list', 'planner.tasks.update']);
  assert.deepEqual(registry.list().map((tool) => tool.id), listed);
});

test('list mutation cannot alter registry state', () => {
  const registry = new HomiToolRegistry();
  registry.register(buildDefinition());

  const listed = registry.list();
  listed.pop();
  listed.push(buildWriteDefinition());
  assert.equal(registry.size, 1);
  assert.deepEqual(registry.list().map((tool) => tool.id), ['planner.tasks.list']);
});

test('retrieved definition mutation cannot alter registry state', () => {
  const registry = new HomiToolRegistry();
  registry.register(buildDefinition());

  const found = registry.get('planner.tasks.list');
  assert.throws(() => {
    'use strict';
    found.id = 'finance.accounts.list';
  }, TypeError);
  assert.throws(() => {
    'use strict';
    found.riskFlags.push('DESTRUCTIVE');
  }, TypeError);
  assert.throws(() => {
    'use strict';
    found.inputSchema.properties.injected = { type: 'string' };
  }, TypeError);

  const stillRegistered = registry.get('planner.tasks.list');
  assert.equal(stillRegistered.id, 'planner.tasks.list');
  assert.deepEqual(Array.from(stillRegistered.riskFlags), ['READ_ONLY']);
  assert.deepEqual(Object.keys(stillRegistered.inputSchema.properties), []);
  assert.equal(registry.size, 1);
});

test('a normalized definition survives a JSON round trip without loss', () => {
  const normalized = normalizeToolDefinition(
    buildDefinition({
      riskFlags: ['EXTERNAL_SIDE_EFFECT', 'READ_ONLY'],
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: { taskId: { type: 'string' } },
        required: ['taskId'],
      },
    })
  );

  const roundTripped = JSON.parse(JSON.stringify(normalized));
  assert.deepEqual(roundTripped, normalized);
  assert.deepEqual(roundTripped.riskFlags, ['READ_ONLY', 'EXTERNAL_SIDE_EFFECT']);
});

test('normalized risk flags use a deterministic canonical order', () => {
  const normalized = normalizeToolDefinition(
    buildDefinition({ riskFlags: ['EXTERNAL_SIDE_EFFECT', 'READ_ONLY'] })
  );
  assert.deepEqual(normalized.riskFlags, ['READ_ONLY', 'EXTERNAL_SIDE_EFFECT']);
});

test('the production Homi module keeps no forbidden dependency', () => {
  const forbidden = [
    'supabase',
    'supabaseAdmin',
    'pg',
    'express',
    'planner.tasks.service',
    'finance',
    'homecloud',
    'inventory',
    'presence',
  ];
  const allowedRequires = ['./toolContract', './toolRegistry'];
  const sources = listHomiSources();

  assert.ok(sources.length > 0, 'expected production Homi sources');

  for (const fileName of sources) {
    const source = readHomiSource(fileName);

    const requireSpecifiers = Array.from(source.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)).map(
      (match) => match[1]
    );

    for (const specifier of requireSpecifiers) {
      assert.ok(
        allowedRequires.includes(specifier),
        `${fileName} must not require "${specifier}"`
      );
      for (const token of forbidden) {
        assert.equal(
          specifier.toLowerCase().includes(token.toLowerCase()),
          false,
          `${fileName} must not require "${specifier}"`
        );
      }
    }

    for (const token of forbidden) {
      const pattern = new RegExp(`\\b${token.replace(/\./g, '\\.')}\\b`, 'i');
      assert.doesNotMatch(source, pattern, `${fileName} must not mention "${token}"`);
    }

    assert.doesNotMatch(source, /\bexpress\b/i, `${fileName} must not depend on Express`);
    assert.doesNotMatch(source, /\bsupabase\b/i, `${fileName} must not depend on Supabase`);
    assert.doesNotMatch(source, /app\.(use|get|post|put|delete)\s*\(/, `${fileName} must not declare HTTP routes`);
    assert.doesNotMatch(source, /\b(createServer|listen)\s*\(/, `${fileName} must not open a server`);
    assert.doesNotMatch(source, /\bselect\b[\s\S]*\bfrom\b/i, `${fileName} must not embed SQL`);
    assert.doesNotMatch(source, /\binsert\s+into\b/i, `${fileName} must not embed SQL`);
    assert.doesNotMatch(source, /\bdelete\s+from\b/i, `${fileName} must not embed SQL`);
    assert.doesNotMatch(source, /\bupdate\b[\s\S]*\bset\b/i, `${fileName} must not embed SQL`);
    assert.doesNotMatch(source, /\b(fetch|XMLHttpRequest)\b/, `${fileName} must not perform network calls`);
  }
});

test('the production Homi module exposes no business tool', () => {
  const source = readHomiSource('index.js');
  assert.doesNotMatch(source, /\.register\(/);
  assert.doesNotMatch(source, /planner|finance|homecloud|inventory/i);

  const registry = createHomiToolRegistry();
  assert.equal(registry.size, 0);
  assert.deepEqual(registry.list(), []);
});
