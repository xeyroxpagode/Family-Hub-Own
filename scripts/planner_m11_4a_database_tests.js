#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');

const { Client } = require('../backend/node_modules/pg');

process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_ANON_KEY ||= 'm11-4a-placeholder';

const DATABASE_URL = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const parsed = new URL(DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
  console.error('ENVIRONMENT_FAILURE: M11.4A database tests are local-only.');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const PREFIX = 'm11_4a_atomic_';
let assertions = 0;

function check(condition, message) {
  assert.ok(condition, message);
  assertions += 1;
  console.log(`PASS: ${message}`);
}

function equal(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
  console.log(`PASS: ${message}`);
}

function fingerprint(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function envelope(extra = {}) {
  return {
    adapter_key: 'planner.task.template.v1',
    payload_schema: 'planner.template_payload',
    payload_version: 1,
    payload: { title: 'Clean kitchen', instructions: 'Reusable checklist', ...extra },
  };
}

async function connect() {
  const client = new Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: 5000, statement_timeout: 15000 });
  await client.connect();
  return client;
}

async function runAs(client, accountId, fn) {
  await client.query(`select set_config('request.jwt.claim.sub', $1, false)`, [accountId]);
  await client.query('set role authenticated');
  try {
    return await fn();
  } finally {
    await client.query('reset role');
  }
}

async function insertAccount(client, label) {
  const accountId = crypto.randomUUID();
  const personId = crypto.randomUUID();
  await client.query(
    `insert into auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values ($1, 'authenticated', 'authenticated', $2, '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now())`,
    [accountId, `${PREFIX}${label}_${crypto.randomUUID()}@example.test`],
  );
  await client.query(
    `insert into public.people (id, auth_user_id, display_name, default_language, personal_settings)
     values ($1, $2, $3, 'es-419', '{}'::jsonb)`,
    [personId, accountId, `M11.4A ${label}`],
  );
  return { accountId, personId };
}

async function insertHousehold(client, owner, label) {
  const householdId = crypto.randomUUID();
  await client.query(
    `insert into public.households (
      id, name, slug, timezone, default_language, config, created_by_person_id
    ) values ($1, $2, $3, 'America/Argentina/Buenos_Aires', 'es-419', $4::jsonb, $5)`,
    [
      householdId,
      `M11.4A ${label}`,
      `${PREFIX}${label}_${householdId}`,
      JSON.stringify({
        permissions: {
          'planner.templates.use': { coordinator: true },
          'planner.templates.manage': { coordinator: true },
        },
      }),
      owner.personId,
    ],
  );
  const membershipId = crypto.randomUUID();
  await client.query(
    `insert into public.household_members (
      id, household_id, person_id, role, status, joined_at,
      household_onboarding_status, household_onboarding_completed_at
    ) values ($1, $2, $3, 'coordinator', 'active', now(), 'completed', now())`,
    [membershipId, householdId, owner.personId],
  );
  await client.query(`update public.people set active_household_id = $1 where id = $2`, [householdId, owner.personId]);
  return { householdId, membershipId };
}

async function count(client, table, where = 'true') {
  const { rows } = await client.query(`select count(*)::int as n from public.${table} where ${where}`);
  return Number(rows[0].n);
}

async function expectSqlError(fn, expectedCode, message) {
  let error = null;
  try {
    await fn();
  } catch (caught) {
    error = caught;
  }
  check(Boolean(error), message);
  if (expectedCode) equal(error.code, expectedCode, `${message} SQLSTATE`);
  return error;
}

async function createPreset(client, actor, overrides = {}) {
  const args = {
    entityType: 'task',
    source: 'personal',
    name: 'Preset atomic',
    envelope: envelope(),
    fingerprint: fingerprint('preset-atomic'),
    requestId: `${PREFIX}req_create`,
    mutationId: `${PREFIX}mut_create`,
    idempotencyKey: `${PREFIX}key_create`,
    ...overrides,
  };
  const { rows } = await runAs(client, actor.accountId, () => client.query(
    `select public.planner_create_preset_v1($1, $2, $3, $4::jsonb, $5, $6, $7, $8) as body`,
    [
      args.entityType,
      args.source,
      args.name,
      JSON.stringify(args.envelope),
      args.fingerprint,
      args.requestId,
      args.mutationId,
      args.idempotencyKey,
    ],
  ));
  return rows[0].body;
}

async function updatePreset(client, actor, presetId, expectedVersion, overrides = {}) {
  const args = {
    name: 'Preset atomic updated',
    requestId: `${PREFIX}req_update`,
    mutationId: `${PREFIX}mut_update`,
    idempotencyKey: `${PREFIX}key_update`,
    ...overrides,
  };
  const { rows } = await runAs(client, actor.accountId, () => client.query(
    `select public.planner_update_preset_metadata_v1($1::uuid, $2, $3, $4, $5, $6) as body`,
    [presetId, expectedVersion, args.name, args.requestId, args.mutationId, args.idempotencyKey],
  ));
  return rows[0].body;
}

async function autosaveDraft(client, actor, overrides = {}) {
  const args = {
    clientDraftKey: `${PREFIX}draft_${crypto.randomUUID()}`,
    envelope: envelope(),
    fingerprint: fingerprint('draft-atomic'),
    ...overrides,
  };
  const { rows } = await runAs(client, actor.accountId, () => client.query(
    `select public.planner_autosave_draft_v1($1, 'task', 'personal', null::uuid, null::uuid, null::uuid, $2::jsonb, $3, null) as body`,
    [args.clientDraftKey, JSON.stringify(args.envelope), args.fingerprint],
  ));
  return rows[0].body;
}

async function trashDraft(client, actor, draftId, expectedVersion, overrides = {}) {
  const args = {
    requestId: `${PREFIX}req_trash`,
    mutationId: `${PREFIX}mut_trash`,
    idempotencyKey: `${PREFIX}key_trash`,
    ...overrides,
  };
  const { rows } = await runAs(client, actor.accountId, () => client.query(
    `select public.planner_trash_draft_v1($1::uuid, $2, $3, $4, $5) as body`,
    [draftId, expectedVersion, args.requestId, args.mutationId, args.idempotencyKey],
  ));
  return rows[0].body;
}

async function databaseSuite() {
  const client = await connect();
  try {
    const actor = await insertAccount(client, 'actor');
    const other = await insertAccount(client, 'other');

    const firstCreate = await createPreset(client, actor);
    const replayCreate = await createPreset(client, actor);
    equal(replayCreate.preset.id, firstCreate.preset.id, 'CREATE PRESET replay returns the same preset id');
    equal(replayCreate.revision.id, firstCreate.revision.id, 'CREATE PRESET replay returns the same revision id');
    equal(replayCreate.preset.version, firstCreate.preset.version, 'CREATE PRESET replay returns the same resulting version');
    equal(replayCreate.outcome, 'replay', 'CREATE PRESET repeated identity reports replay');
    equal(await count(client, 'planner_presets', `created_by_person_id = '${actor.personId}'`), 1, 'CREATE PRESET creates exactly one preset');
    equal(await count(client, 'planner_preset_revisions', `created_by_person_id = '${actor.personId}'`), 1, 'CREATE PRESET creates exactly one revision');
    equal(await count(client, 'audit_events', `actor_person_id = '${actor.personId}' and action = 'preset.created'`), 1, 'CREATE PRESET writes audit exactly once');

    await expectSqlError(
      () => createPreset(client, actor, { name: 'Preset different payload' }),
      'P0008',
      'CREATE PRESET same identity with different payload conflicts',
    );
    await expectSqlError(
      () => createPreset(client, actor, {
        name: 'Preset different mutation key',
        idempotencyKey: `${PREFIX}key_create_changed`,
      }),
      'P0008',
      'CREATE PRESET same mutation with different key conflicts',
    );
    equal(await count(client, 'planner_presets', `created_by_person_id = '${actor.personId}'`), 1, 'CREATE PRESET conflict has no domain effect');
    equal(await count(client, 'audit_events', `actor_person_id = '${actor.personId}' and action = 'preset.created'`), 1, 'CREATE PRESET conflict writes no audit');

    const concurrentKey = `${PREFIX}key_create_concurrent`;
    const [concurrentA, concurrentB] = await Promise.all([
      createPreset(client, actor, { name: 'Concurrent preset', requestId: `${PREFIX}req_ca`, mutationId: `${PREFIX}mut_ca`, idempotencyKey: concurrentKey }),
      createPreset(client, actor, { name: 'Concurrent preset', requestId: `${PREFIX}req_ca`, mutationId: `${PREFIX}mut_ca`, idempotencyKey: concurrentKey }),
    ]);
    equal(concurrentA.preset.id, concurrentB.preset.id, 'CREATE PRESET concurrent same identity returns one entity');
    equal(await count(client, 'planner_presets', `created_by_person_id = '${actor.personId}' and name = 'Concurrent preset'`), 1, 'CREATE PRESET concurrency does not duplicate rows');

    const otherCreate = await createPreset(client, other, {
      idempotencyKey: `${PREFIX}key_create`,
      mutationId: `${PREFIX}mut_create_other_actor`,
    });
    check(otherCreate.preset.id !== firstCreate.preset.id, 'shared key between actors does not replay another actor response');

    const householdOne = await insertHousehold(client, actor, 'household_one');
    const householdCreate = await createPreset(client, actor, {
      source: 'household',
      name: 'Household scoped preset',
      requestId: `${PREFIX}req_household`,
      mutationId: `${PREFIX}mut_household`,
      idempotencyKey: `${PREFIX}key_create`,
    });
    equal(householdCreate.preset.household_id, householdOne.householdId, 'household scoped preset resolves household from authenticated actor');
    const householdTwo = await insertHousehold(client, other, 'household_two');
    const householdOther = await createPreset(client, other, {
      source: 'household',
      name: 'Household scoped preset',
      requestId: `${PREFIX}req_household_other`,
      mutationId: `${PREFIX}mut_household_other`,
      idempotencyKey: `${PREFIX}key_create`,
    });
    equal(householdOther.preset.household_id, householdTwo.householdId, 'same key in different household has separate scope identity');

    await expectSqlError(
      () => createPreset(client, actor, { entityType: 'invalid', requestId: `${PREFIX}req_invalid_effect`, mutationId: `${PREFIX}mut_invalid_effect`, idempotencyKey: `${PREFIX}key_invalid_effect` }),
      '23514',
      'CREATE PRESET rolls back when domain effect fails',
    );
    equal(await count(client, 'planner_idempotency_keys', `idempotency_key = '${PREFIX}key_invalid_effect'`), 0, 'failed effect leaves no idempotency lease');

    const beforeAuditFailurePresetCount = await count(client, 'planner_presets', `created_by_person_id = '${actor.personId}'`);
    await expectSqlError(
      () => createPreset(client, actor, { requestId: `${PREFIX}req_bad_audit`, mutationId: `${PREFIX}mut bad audit`, idempotencyKey: `${PREFIX}key_bad_audit` }),
      '23514',
      'CREATE PRESET rolls back when audit fails',
    );
    equal(await count(client, 'planner_presets', `created_by_person_id = '${actor.personId}'`), beforeAuditFailurePresetCount, 'audit failure leaves no domain row');
    equal(await count(client, 'planner_idempotency_keys', `idempotency_key = '${PREFIX}key_bad_audit'`), 0, 'audit failure leaves no idempotency lease');

    const updateFirst = await updatePreset(client, actor, firstCreate.preset.id, firstCreate.preset.version);
    const updateReplay = await updatePreset(client, actor, firstCreate.preset.id, firstCreate.preset.version);
    equal(updateReplay.preset.id, updateFirst.preset.id, 'UPDATE PRESET replay returns same preset');
    equal(updateReplay.preset.version, updateFirst.preset.version, 'UPDATE PRESET replay does not increment version again');
    equal(updateReplay.outcome, 'replay', 'UPDATE PRESET repeated identity reports replay');
    equal(await count(client, 'planner_preset_revisions', `preset_id = '${firstCreate.preset.id}'`), 1, 'UPDATE PRESET creates no extra revision');
    equal(await count(client, 'audit_events', `actor_person_id = '${actor.personId}' and action = 'preset.metadata_updated' and aggregate_id = '${firstCreate.preset.id}'`), 1, 'UPDATE PRESET writes audit exactly once');
    await expectSqlError(
      () => updatePreset(client, actor, firstCreate.preset.id, firstCreate.preset.version, { name: 'Different update payload' }),
      'P0008',
      'UPDATE PRESET same identity with different payload conflicts',
    );
    await expectSqlError(
      () => updatePreset(client, actor, firstCreate.preset.id, firstCreate.preset.version, {
        name: 'Different update key',
        idempotencyKey: `${PREFIX}key_update_changed`,
      }),
      'P0008',
      'UPDATE PRESET same mutation with different key conflicts',
    );
    const updateStale = await updatePreset(client, actor, firstCreate.preset.id, firstCreate.preset.version, {
      name: 'Stale update',
      requestId: `${PREFIX}req_update_stale`,
      mutationId: `${PREFIX}mut_update_stale`,
      idempotencyKey: `${PREFIX}key_update_stale`,
    });
    equal(updateStale.outcome, 'version_conflict', 'UPDATE PRESET new identity with old version returns canonical version conflict');
    equal(await count(client, 'audit_events', `actor_person_id = '${actor.personId}' and action = 'preset.metadata_updated' and aggregate_id = '${firstCreate.preset.id}'`), 1, 'UPDATE PRESET stale version writes no audit');

    const draftFirst = await autosaveDraft(client, actor);
    const trashFirst = await trashDraft(client, actor, draftFirst.draft.id, draftFirst.draft.version);
    const trashReplay = await trashDraft(client, actor, draftFirst.draft.id, draftFirst.draft.version);
    equal(trashReplay.draft.id, trashFirst.draft.id, 'TRASH DRAFT replay returns same draft');
    equal(trashReplay.draft.version, trashFirst.draft.version, 'TRASH DRAFT replay does not increment version again');
    equal(trashReplay.draft.trashed_from_state, trashFirst.draft.trashed_from_state, 'TRASH DRAFT replay preserves previous state');
    equal(trashReplay.outcome, 'replay', 'TRASH DRAFT repeated identity reports replay');
    equal(await count(client, 'audit_events', `actor_person_id = '${actor.personId}' and action = 'draft.trashed' and aggregate_id = '${draftFirst.draft.id}'`), 1, 'TRASH DRAFT writes audit exactly once');
    await expectSqlError(
      () => trashDraft(client, actor, draftFirst.draft.id, draftFirst.draft.version, { mutationId: `${PREFIX}mut_trash_different` }),
      'P0008',
      'TRASH DRAFT same key with different mutation conflicts',
    );
    await expectSqlError(
      () => trashDraft(client, actor, draftFirst.draft.id, draftFirst.draft.version, { idempotencyKey: `${PREFIX}key_trash_changed` }),
      'P0008',
      'TRASH DRAFT same mutation with different key conflicts',
    );
    const trashStale = await trashDraft(client, actor, draftFirst.draft.id, draftFirst.draft.version, {
      requestId: `${PREFIX}req_trash_stale`,
      mutationId: `${PREFIX}mut_trash_stale`,
      idempotencyKey: `${PREFIX}key_trash_stale`,
    });
    equal(trashStale.outcome, 'version_conflict', 'TRASH DRAFT new identity with old version returns canonical version conflict');
    equal(await count(client, 'audit_events', `actor_person_id = '${actor.personId}' and action = 'draft.trashed' and aggregate_id = '${draftFirst.draft.id}'`), 1, 'TRASH DRAFT stale version writes no audit');

    await expectSqlError(
      () => trashDraft(client, other, draftFirst.draft.id, draftFirst.draft.version, {
        requestId: `${PREFIX}req_spoof`,
        mutationId: `${PREFIX}mut_spoof`,
        idempotencyKey: `${PREFIX}key_spoof`,
      }),
      '42501',
      'TRASH DRAFT actor spoofing is denied by authenticated actor',
    );

    equal(await count(client, 'planner_idempotency_keys', `key_state = 'in_flight'`), 0, 'cleanup of leases leaves no in-flight idempotency rows');
  } finally {
    await client.end();
  }
}

async function httpControllerSuite() {
  const contextPath = require.resolve(path.join(ROOT, 'backend/src/services/planner.context.service.js'));
  const presetsControllerPath = require.resolve(path.join(ROOT, 'backend/src/controllers/planner.presets.controller.js'));
  const draftsControllerPath = require.resolve(path.join(ROOT, 'backend/src/controllers/planner.drafts.controller.js'));
  const contextModule = require(contextPath);
  const originalGetPlannerContext = contextModule.getPlannerContext;
  const rpcCalls = [];
  const context = {
    accountId: '55555555-5555-4555-8555-555555555555',
    personId: '44444444-4444-4444-8444-444444444444',
    householdId: '22222222-2222-4222-8222-222222222222',
    membershipId: '33333333-3333-4333-8333-333333333333',
    membership: { role: 'coordinator', status: 'active' },
    household: { id: '22222222-2222-4222-8222-222222222222', config: {} },
    client: {
      async rpc(name, args) {
        rpcCalls.push({ name, args });
        if (name === 'planner_create_preset_v1') {
          return { data: { preset: { id: 'preset-http', version: 2 }, revision: { id: 'revision-http', version: 1 }, outcome: 'created' }, error: null };
        }
        if (name === 'planner_update_preset_metadata_v1') {
          return { data: { outcome: 'version_conflict', current_version: 3 }, error: null };
        }
        if (name === 'planner_trash_draft_v1') {
          return { data: { draft: { id: 'draft-http', version: 2 }, outcome: 'replay', response_status: 200 }, error: null };
        }
        throw new Error(`Unexpected RPC ${name}`);
      },
    },
  };

  contextModule.getPlannerContext = async () => context;
  delete require.cache[presetsControllerPath];
  delete require.cache[draftsControllerPath];
  const presetsController = require(presetsControllerPath);
  const draftsController = require(draftsControllerPath);

  const response = () => ({
    statusCode: null,
    body: null,
    headers: {},
    set(name, value) {
      if (typeof name === 'object') Object.assign(this.headers, name);
      else this.headers[name] = value;
      return this;
    },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  });

  try {
    const createRes = response();
    await presetsController.createPreset({
      method: 'POST',
      params: {},
      body: { entity_type: 'task', source: 'personal', name: 'HTTP preset', payload: { title: 'HTTP task' } },
      headers: { 'x-mutation-id': 'http-mut-create', 'idempotency-key': 'http-key-create' },
      requestId: 'http-req-create',
      user: { id: context.accountId },
      accessToken: 'token',
    }, createRes);
    equal(createRes.statusCode, 201, 'HTTP CREATE PRESET preserves created status');
    equal(rpcCalls.at(-1).args.p_idempotency_key, 'http-key-create', 'HTTP CREATE PRESET forwards Idempotency-Key to atomic RPC');

    const updateRes = response();
    await presetsController.updatePresetMetadata({
      method: 'PATCH',
      params: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
      body: { name: 'HTTP update' },
      headers: { 'x-mutation-id': 'http-mut-update', 'idempotency-key': 'http-key-update', 'if-match': '2' },
      requestId: 'http-req-update',
      user: { id: context.accountId },
      accessToken: 'token',
    }, updateRes);
    equal(updateRes.statusCode, 412, 'HTTP UPDATE PRESET maps failed-stable version conflict to 412');
    equal(updateRes.body.error.code, 'version_conflict_v2', 'HTTP UPDATE PRESET returns canonical version conflict code');
    equal(rpcCalls.at(-1).args.p_idempotency_key, 'http-key-update', 'HTTP UPDATE PRESET forwards Idempotency-Key to atomic RPC');

    const trashRes = response();
    await draftsController.trashDraft({
      method: 'POST',
      params: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
      body: {},
      headers: { 'x-mutation-id': 'http-mut-trash', 'idempotency-key': 'http-key-trash', 'if-match': '1' },
      requestId: 'http-req-trash',
      user: { id: context.accountId },
      accessToken: 'token',
    }, trashRes);
    equal(trashRes.statusCode, 200, 'HTTP TRASH DRAFT returns replay response status');
    equal(trashRes.body.outcome, 'replay', 'HTTP TRASH DRAFT exposes replay outcome');
    equal(rpcCalls.at(-1).args.p_idempotency_key, 'http-key-trash', 'HTTP TRASH DRAFT forwards Idempotency-Key to atomic RPC');
  } finally {
    contextModule.getPlannerContext = originalGetPlannerContext;
    delete require.cache[presetsControllerPath];
    delete require.cache[draftsControllerPath];
  }
}

async function assertCleanOnly() {
  const client = await connect();
  try {
    equal(await count(client, 'planner_presets'), 0, 'CLEAN: planner_presets = 0');
    equal(await count(client, 'planner_preset_revisions'), 0, 'CLEAN: planner_preset_revisions = 0');
    equal(await count(client, 'planner_drafts'), 0, 'CLEAN: planner_drafts = 0');
    equal(await count(client, 'planner_idempotency_keys'), 0, 'CLEAN: planner_idempotency_keys = 0');
    equal(await count(client, 'audit_events'), 0, 'CLEAN: audit_events = 0');
  } finally {
    await client.end();
  }
}

async function main() {
  if (process.argv.includes('--assert-clean')) {
    await assertCleanOnly();
  } else {
    await databaseSuite();
    await httpControllerSuite();
  }
  console.log(`\nM11.4A PRESETS/DRAFTS ATOMIC TESTS: ${assertions} assertions passed.`);
}

main().catch((error) => {
  console.error(`M11.4A_PRESETS_DRAFTS_FAILURE: ${error.stack ?? error}`);
  process.exitCode = 1;
});
