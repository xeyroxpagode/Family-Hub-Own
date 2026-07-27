#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_ANON_KEY ||= 'm11-presets-drafts-placeholder';

const ROOT = path.resolve(__dirname, '..');
let assertions = 0;

function check(condition, message) {
  assert.ok(condition, message);
  assertions += 1;
  console.log(`PASS: ${message}`);
}

function equal(actual, expected, message) {
  assert.equal(actual, expected, message);
  assertions += 1;
  console.log(`PASS: ${message}`);
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

const {
  buildPayloadEnvelope,
  PAYLOAD_SCHEMA,
} = require('../backend/src/contracts/planner.presets-drafts.contract');
const {
  getAdapter,
  getDefaultAdapter,
  validateEnvelopeForUse,
} = require('../backend/src/adapters/planner.presets-drafts.adapters');
const {
  InMemoryPresetRepository,
  createPlannerPresetsService,
} = require('../backend/src/services/planner.presets.service');
const {
  InMemoryDraftRepository,
  createPlannerDraftsService,
} = require('../backend/src/services/planner.drafts.service');
const {
  PlannerDraftAutosaveCoordinator,
} = require('../backend/src/services/planner.drafts.autosaveCoordinator');

const contextA = {
  personId: 'person-a',
  membershipId: 'member-a',
  householdId: 'household-1',
  accountId: 'account-a',
};
const contextB = {
  personId: 'person-b',
  membershipId: 'member-b',
  householdId: 'household-1',
  accountId: 'account-b',
};

function taskPayload(extra = {}) {
  return {
    title: 'Clean kitchen',
    instructions: 'Reusable checklist',
    category: 'home',
    visual: { color: 'green' },
    placeholders: [{ id: 'who', type: 'person', path: 'assignee', required: true }],
    ...extra,
  };
}

function eventPayload(extra = {}) {
  return {
    title: 'Family dinner',
    category: 'family',
    suggestedDurationMinutes: 90,
    placeholders: [{ id: 'when', type: 'date', path: 'date', required: true }],
    ...extra,
  };
}

function planPayload(extra = {}) {
  return {
    objectiveTemplate: 'Prepare birthday',
    milestones: [{ id: 'm1', title: 'Shopping' }],
    tasks: [{ id: 't1', title: 'Buy supplies', necessary: true }],
    events: [{ id: 'e1', title: 'Party' }],
    measurements: [{ id: 'budget', target: 100, unit: 'usd' }],
    relationships: [{ from: 'm1', to: 't1' }],
    placeholders: [{ id: 'place', type: 'place', path: 'events[0].place', required: false }],
    ...extra,
  };
}

function testPayloadsAndAdapters() {
  const task = getAdapter('planner.task.template.v1', 'task').value;
  const event = getAdapter('planner.event.template.v1', 'event').value;
  const plan = getAdapter('planner.plan.template.v1', 'plan').value;

  check(task.validatePresetPayload(taskPayload()).ok, 'Task Preset accepts stable reusable fields');
  check(!task.validatePresetPayload(taskPayload({ dueDate: '2026-08-01' })).ok, 'Task Preset rejects concrete due date');
  check(!task.validatePresetPayload(taskPayload({ assignees: ['member-a'] })).ok, 'Task Preset rejects concrete assignees');
  check(!task.validatePresetPayload(taskPayload({ fulfillment: { status: 'completed' } })).ok, 'Task Preset rejects fulfillment state');
  check(!task.validatePresetPayload(taskPayload({ evidence: ['photo'] })).ok, 'Task Preset rejects evidence');

  check(event.validatePresetPayload(eventPayload()).ok, 'Event Preset accepts stable reusable fields');
  check(!event.validatePresetPayload(eventPayload({ startDate: '2026-08-01' })).ok, 'Event Preset rejects concrete date');
  check(!event.validatePresetPayload(eventPayload({ participants: ['member-a'] })).ok, 'Event Preset rejects participants');
  check(!event.validatePresetPayload(eventPayload({ rsvp: 'yes' })).ok, 'Event Preset rejects RSVP');
  check(!event.validatePresetPayload(eventPayload({ attendance: 'present' })).ok, 'Event Preset rejects attendance');

  check(plan.validatePresetPayload(planPayload()).ok, 'Plan Preset accepts reusable graph payload');
  check(!plan.validatePresetPayload(planPayload({ progress: 50 })).ok, 'Plan Preset rejects current progress');
  check(!plan.validatePresetPayload(planPayload({ measurements: [{ id: 'm', currentValue: 5 }] })).ok, 'Plan Preset rejects current Measurement values');
  check(!plan.validatePresetPayload(planPayload({ history: [{ at: 'now' }] })).ok, 'Plan Preset rejects history');

  check(task.validateDraftPayload(taskPayload({ dueDate: '2026-08-01', futureNote: 'typed by user' })).ok, 'Draft allows future execution data while still private');
  check(!task.validateDraftPayload(taskPayload({ lifecycle: 'active' })).ok, 'Draft rejects operational lifecycle authority');
  check(!validateEnvelopeForUse({ payload: taskPayload(), entity_type: 'task', adapter_key: task.key, payload_schema: PAYLOAD_SCHEMA }, 'draft').ok, 'payload without version fails');
  check(!validateEnvelopeForUse({ ...buildPayloadEnvelope('task', task.key, taskPayload()), payload_schema: 'opaque' }, 'draft').ok, 'schema mismatch fails');
  check(!validateEnvelopeForUse({ ...buildPayloadEnvelope('task', task.key, taskPayload()), payload_version: 999 }, 'draft').ok, 'unknown version fails');
  check(validateEnvelopeForUse({ ...buildPayloadEnvelope('task', task.key, { title: 'Old' }, 1) }, 'draft').ok, 'known payload migration works');

  equal(getDefaultAdapter('task').value.key, task.key, 'Task adapter registry resolves default adapter');
  equal(getDefaultAdapter('event').value.key, event.key, 'Event adapter registry resolves default adapter');
  equal(getDefaultAdapter('plan').value.key, plan.key, 'Plan adapter registry resolves default adapter');
  equal(getAdapter('missing.adapter').code, 'adapter_not_found', 'missing adapter returns stable error');
  equal(getAdapter(task.key, 'event').code, 'adapter_entity_mismatch', 'entity mismatch returns stable error');

  const fpA = task.getStructuralFingerprint({ b: 2, a: 1 });
  const fpB = task.getStructuralFingerprint({ a: 1, b: 2 });
  const fpC = task.getStructuralFingerprint({ a: 1, b: 3 });
  equal(fpA, fpB, 'fingerprint ignores object key order');
  check(fpA !== fpC, 'fingerprint changes with structural change');
  const original = taskPayload();
  const prepared = task.prepareApplicationPayload({}, original);
  check(prepared.applicationPayload !== original, 'prepare application produces a fresh copy');
  equal(original.title, 'Clean kitchen', 'prepare application does not mutate original payload');
}

async function testRevisionsAndDrafts() {
  const presetRepo = new InMemoryPresetRepository();
  const presets = createPlannerPresetsService(presetRepo);
  const created = await presets.createPreset(contextA, {
    name: 'Kitchen',
    entity_type: 'task',
    source: 'personal',
    adapter_key: 'planner.task.template.v1',
    payload: taskPayload(),
  });
  equal(created.outcome, 'created', 'initial preset creation succeeds');
  equal(created.preset.active_revision_id, created.revision.id, 'initial preset publishes active revision atomically');

  const history1 = await presets.listRevisionHistory(contextA, created.preset.id);
  equal(history1.revisions.length, 1, 'revision history exposes initial revision');
  const draftRevision = await presets.startRevision(contextA, created.preset.id);
  equal(draftRevision.revision.revision_state, 'draft', 'start revision creates a draft revision');

  let duplicateOpen = null;
  try {
    await presets.startRevision(contextA, created.preset.id);
  } catch (error) {
    duplicateOpen = error;
  }
  equal(duplicateOpen.code, 'preset_revision_already_open', 'only one open draft revision is allowed');

  const updatedRevision = await presets.updateRevisionDraft(contextA, draftRevision.revision.id, {
    entity_type: 'task',
    adapter_key: 'planner.task.template.v1',
    payload: taskPayload({ title: 'Clean kitchen deeply' }),
  }, draftRevision.revision.version);
  equal(updatedRevision.outcome, 'updated', 'draft revision updates when payload changes');

  const noopRevision = await presets.updateRevisionDraft(contextA, draftRevision.revision.id, {
    entity_type: 'task',
    adapter_key: 'planner.task.template.v1',
    payload: taskPayload({ title: 'Clean kitchen deeply' }),
  }, updatedRevision.revision.version);
  equal(noopRevision.outcome, 'noop', 'equivalent revision update returns noop');

  let stale = null;
  try {
    await presets.updateRevisionDraft(contextA, draftRevision.revision.id, {
      entity_type: 'task',
      adapter_key: 'planner.task.template.v1',
      payload: taskPayload({ title: 'Stale' }),
    }, 1);
  } catch (error) {
    stale = error;
  }
  equal(stale.code, 'version_conflict_v2', 'stale revision update detects version conflict');

  const beforePublish = (await presets.getPreset(contextA, created.preset.id)).preset.active_revision_id;
  const published = await presets.publishRevision(contextA, draftRevision.revision.id, noopRevision.revision.version);
  equal(published.revision.revision_state, 'published', 'publish marks draft revision as published');
  check(beforePublish !== published.preset.active_revision_id, 'publish changes active revision explicitly');

  let immutable = null;
  try {
    await presets.updateRevisionDraft(contextA, published.revision.id, {
      entity_type: 'task',
      adapter_key: 'planner.task.template.v1',
      payload: taskPayload({ title: 'Illegal' }),
    }, published.revision.version);
  } catch (error) {
    immutable = error;
  }
  equal(immutable.code, 'preset_revision_not_publishable', 'published revision is immutable');

  const prepared = await presets.prepareApplicationPayload(contextA, created.preset.id);
  equal(prepared.data.entityType, 'task', 'preset prepare returns adapter typed descriptor');

  const trashed = await presets.trashPreset(contextA, created.preset.id, published.preset.version);
  check(Boolean(trashed.preset.retention_expires_at), 'preset trash records retention expiry');
  const restored = await presets.restorePreset(contextA, created.preset.id, trashed.preset.version);
  equal(restored.preset.trashed_at, null, 'preset restore clears trash state');

  const draftRepo = new InMemoryDraftRepository();
  const drafts = createPlannerDraftsService(draftRepo);
  let emptyDraft = null;
  try {
    await drafts.autosaveDraft(contextA, {
      client_draft_key: 'empty',
      entity_type: 'task',
      adapter_key: 'planner.task.template.v1',
      intended_scope: 'personal',
      payload: { title: '   ' },
    });
  } catch (error) {
    emptyDraft = error;
  }
  equal(emptyDraft.code, 'draft_not_meaningful', 'empty draft does not persist');
  for (const [label, payload] of [
    ['default-only', { reusableConfig: {} }],
    ['whitespace-only', { title: '   ' }],
    ['technical metadata only', { clientRevision: 2, lastLocalEditAt: 'now' }],
  ]) {
    let error = null;
    try {
      await drafts.autosaveDraft(contextA, {
        client_draft_key: label,
        entity_type: 'task',
        adapter_key: 'planner.task.template.v1',
        intended_scope: 'personal',
        payload,
      });
    } catch (caught) {
      error = caught;
    }
    equal(error.code, 'draft_not_meaningful', `${label} draft does not persist`);
  }

  const savedDraft = await drafts.autosaveDraft(contextA, {
    client_draft_key: 'task-flow',
    entity_type: 'task',
    adapter_key: 'planner.task.template.v1',
    intended_scope: 'household',
    payload: taskPayload({ dueDate: '2026-08-01' }),
  });
  equal(savedDraft.outcome, 'created', 'real title draft persists');
  equal(savedDraft.draft.owner_person_id, contextA.personId, 'draft owner is derived from context');
  equal(savedDraft.draft.intended_scope, 'household', 'intended household scope is recorded');

  let otherOwner = null;
  try {
    await drafts.getDraft(contextB, savedDraft.draft.id);
  } catch (error) {
    otherOwner = error;
  }
  equal(otherOwner.code, 'not_found', 'same-household non-owner cannot read draft');

  const recovered = await drafts.recoverDraft(contextA, 'task-flow', 'task');
  equal(recovered.draft.id, savedDraft.draft.id, 'autosave recovery uses owner, client key and entity type');

  const updatedDraft = await drafts.autosaveDraft(contextA, {
    client_draft_key: 'task-flow',
    entity_type: 'task',
    adapter_key: 'planner.task.template.v1',
    intended_scope: 'household',
    payload: taskPayload({ title: 'Clean kitchen again' }),
  }, savedDraft.draft.version);
  equal(updatedDraft.outcome, 'updated', 'autosave update reuses draft row');

  let staleDraft = null;
  try {
    await drafts.autosaveDraft(contextA, {
      client_draft_key: 'task-flow',
      entity_type: 'task',
      adapter_key: 'planner.task.template.v1',
      intended_scope: 'household',
      payload: taskPayload({ title: 'Conflicting edit' }),
    }, savedDraft.draft.version);
  } catch (error) {
    staleDraft = error;
  }
  equal(staleDraft.code, 'version_conflict_v2', 'stale autosave detects conflict');

  const planDraft = await drafts.autosaveDraft(contextA, {
    client_draft_key: 'plan-flow',
    entity_type: 'plan',
    adapter_key: 'planner.plan.template.v1',
    intended_scope: 'personal',
    payload: planPayload(),
  });
  equal(planDraft.outcome, 'created', 'real Plan structure draft persists');
  const preparedDraft = await drafts.prepareActivationPayload(contextA, planDraft.draft.id);
  equal(preparedDraft.data.entityType, 'plan', 'draft prepare returns typed activation descriptor');
  const trashedDraft = await drafts.trashDraft(contextA, updatedDraft.draft.id, updatedDraft.draft.version);
  check(Boolean(trashedDraft.draft.retention_expires_at), 'draft trash records retention expiry');
  const restoredDraft = await drafts.restoreDraft(contextA, updatedDraft.draft.id, trashedDraft.draft.version);
  equal(restoredDraft.draft.trashed_at, null, 'draft restore clears trash state');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function testAutosaveCoordinator() {
  let calls = 0;
  const seen = [];
  const coordinator = new PlannerDraftAutosaveCoordinator({
    ownerPersonId: 'person-a',
    debounceMs: 5,
    retryDelayMs: 5,
    transport: async (payload, options) => {
      calls += 1;
      seen.push({ payload, options });
      await sleep(2);
      return { data: { version: calls }, version: calls };
    },
  });
  coordinator.edit({ client_draft_key: 'k', entity_type: 'task', adapter_key: 'a', intended_scope: 'personal', payload: { title: 'A' } });
  coordinator.edit({ client_draft_key: 'k', entity_type: 'task', adapter_key: 'a', intended_scope: 'personal', payload: { title: 'B' } });
  await sleep(80);
  equal(calls, 1, 'debounce and coalescing send only latest edit');
  equal(seen[0].payload.payload.title, 'B', 'coalescing sends latest payload');
  equal(coordinator.state, 'synced', 'autosave reaches synced state');

  let resolvers = [];
  const slow = new PlannerDraftAutosaveCoordinator({
    ownerPersonId: 'person-a',
    debounceMs: 1,
    transport: (payload) => new Promise((resolve) => {
      resolvers.push(() => resolve({ data: { version: payload.payload.title === 'old' ? 2 : 3 }, version: payload.payload.title === 'old' ? 2 : 3 }));
    }),
  });
  slow.edit({ client_draft_key: 'k2', entity_type: 'task', adapter_key: 'a', intended_scope: 'personal', payload: { title: 'old' } });
  await sleep(20);
  slow.edit({ client_draft_key: 'k2', entity_type: 'task', adapter_key: 'a', intended_scope: 'personal', payload: { title: 'new' } });
  resolvers[0]();
  await sleep(20);
  resolvers[1]();
  await sleep(20);
  equal(slow.serverVersion, 3, 'older response does not overwrite newer payload');
  equal(slow.state, 'synced', 'new edit during in-flight request flushes after first response');

  let failures = 0;
  const retry = new PlannerDraftAutosaveCoordinator({
    ownerPersonId: 'person-a',
    debounceMs: 2,
    retryDelayMs: 10,
    transport: async () => {
      failures += 1;
      if (failures === 1) throw new Error('network');
      return { data: { version: 1 }, version: 1 };
    },
  });
  retry.edit({ client_draft_key: 'retry', entity_type: 'task', adapter_key: 'a', intended_scope: 'personal', payload: { title: 'Retry' } });
  await sleep(60);
  equal(failures, 2, 'retry runs after transient failure');
  equal(retry.state, 'synced', 'retry can recover to synced');

  const conflict = new PlannerDraftAutosaveCoordinator({
    ownerPersonId: 'person-a',
    debounceMs: 1,
    transport: async () => {
      const error = new Error('conflict');
      error.code = 'version_conflict_v2';
      error.statusCode = 412;
      throw error;
    },
  });
  conflict.edit({ client_draft_key: 'conflict', entity_type: 'task', adapter_key: 'a', intended_scope: 'personal', payload: { title: 'Local' } });
  await sleep(40);
  equal(conflict.state, 'conflict', 'conflict state is exposed');
  equal(conflict.conflict.localPayload.title, 'Local', 'conflict preserves local payload');

  const recover = new PlannerDraftAutosaveCoordinator({
    ownerPersonId: 'person-a',
    debounceMs: 1000,
    transport: async () => ({ data: { version: 1 }, version: 1 }),
  });
  recover.edit({ client_draft_key: 'recover', entity_type: 'task', adapter_key: 'a', intended_scope: 'personal', payload: { title: 'Recover' } });
  check(Boolean(recover.recover('recover')), 'local recovery returns pending payload');
  recover.cancel();
  recover.edit({ client_draft_key: 'recover', entity_type: 'task', adapter_key: 'a', intended_scope: 'personal', payload: { title: 'Ignored' } });
  equal(recover.state, 'pending_sync', 'cancel prevents new edit from changing state');
  recover.switchOwner('person-b');
  equal(recover.recover('recover'), null, 'owner switch clears prior owner local draft state');
  equal(recover.activityCount, 0, 'autosave coordinator creates no Activity');
  recover.markTrashedPendingSync();
  equal(recover.state, 'trashed_pending_sync', 'trashed pending sync state is represented');
}

function testArchitecture() {
  const adapterSource = read('backend/src/adapters/planner.presets-drafts.adapters.js');
  const presetService = read('backend/src/services/planner.presets.service.js');
  const draftService = read('backend/src/services/planner.drafts.service.js');
  const routerGlobal = read('backend/src/routes/planner.js');
  const migration = read('supabase/migrations/20260722050000_m11_4a_presets_drafts_foundation.sql');

  check(!adapterSource.includes('planner.tasks.service'), 'adapters do not import Task mutation services');
  check(!adapterSource.includes('planner.events.service'), 'adapters do not import Event mutation services');
  check(!adapterSource.includes('planner.goals.service'), 'adapters do not import Plan/Goal mutation services');
  check(!presetService.includes(".from('planner_tasks'") && !draftService.includes(".from('planner_tasks'"), 'services do not write Task tables');
  check(!presetService.includes(".from('planner_events'") && !draftService.includes(".from('planner_events'"), 'services do not write Event tables');
  check(!presetService.includes(".from('planner_goals'") && !draftService.includes(".from('planner_goals'"), 'services do not write Plan tables');
  check(!routerGlobal.includes('planner.presets-drafts'), 'global Planner router is not modified');
  check(migration.includes('20260722050000') || migration.includes('M11.4A'), 'migration is inside Presets/Drafts range');
  check(migration.includes('planner_drafts_owner_client_key_uidx'), 'client draft key uniqueness is owner scoped');
  check(migration.includes('planner_preset_revisions_one_open_draft_uidx'), 'one-open-draft-revision constraint exists');
  check(migration.includes('revoke all on public.planner_drafts'), 'draft direct writes are revoked');
  check(migration.includes('owner_person_id = public.current_person_id()'), 'Draft RLS is owner-only');
  check(migration.includes('planner_v2_append_audit'), 'human preset/draft operations use shared audit helper');
  const autosaveBody = migration.slice(
    migration.indexOf('create or replace function public.planner_autosave_draft_v1'),
    migration.indexOf('create or replace function public.planner_trash_draft_v1'),
  );
  check(!autosaveBody.includes('planner_v2_append_audit'), 'autosave does not append audit');
  check(!migration.includes('references public.planner_tasks'), 'migration has no Task FK');
  check(!migration.includes('references public.planner_events'), 'migration has no Event FK');
  check(!migration.includes('references public.planner_goals'), 'migration has no Plan/Goal FK');
  check(read('front/mi-front-limpio/hooks/usePlannerDraftAutosave.ts').includes('version_conflict_v2'), 'frontend autosave exposes version conflict');
}

(async () => {
  testPayloadsAndAdapters();
  await testRevisionsAndDrafts();
  await testAutosaveCoordinator();
  testArchitecture();
  console.log(`ASSERTIONS: ${assertions}`);
})().catch((error) => {
  console.error(error);
  console.error(`ASSERTIONS_BEFORE_FAILURE: ${assertions}`);
  process.exit(1);
});
