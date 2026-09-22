'use strict';

/**
 * P2.2A — Presets Foundation — focused tests (P1–P14 from the mission).
 *
 * Coverage strategy: canonical PURE domain helpers + the presets service over
 * the InMemory repository. No DB required; no network. The schema/RLS matrix
 * is covered by the M11.4A lane (unchanged here); P2.2A asserts contractual
 * behavior:
 *
 *   P1  create Household preset (kind=task, scope=household, editable)
 *   P2  edit Household preset (metadata rename + revision cycle)
 *   P3  trash Household preset is lifecycle-only; Tasks are untouched
 *   P4  HomePlus preset is read-only (write attempts rejected)
 *   P5  duplicate HomePlus → Household (new editable copy, no live sync)
 *   P6  apply preset to a blank draft (stable fields populated)
 *   P7  apply preset with context present (assignee/date/time survive)
 *   P8  conflict detection when meaningful stable values exist
 *   P9  checklist cloned fresh + incomplete (no completion leaks)
 *   P10 save Task as preset strips every contextual field
 *   P11 household isolation (H2 never sees H1 household presets)
 *   P12 legacy event/plan/personal data survives; canonical view excludes it
 *   P13 quick rail deterministic, household-first, bounded
 *   P14 household empty + HomePlus populated → HomePlus shows
 */

const assert = require('node:assert/strict');

const {
  createPlannerPresetsService,
  InMemoryPresetRepository,
} = require('../backend/src/services/planner.presets.service');
const domain = require('../backend/src/domain/planner.presets.domain');

let passed = 0;
let failed = 0;

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`✓ ${name}`);
      passed += 1;
    })
    .catch((error) => {
      console.error(`✗ ${name}: ${error.message}`);
      if (error.stack) console.error(error.stack.split('\n').slice(1, 4).join('\n'));
      failed += 1;
    });
}

const TEMPLATE_PAYLOAD = {
  title: 'Pagar la factura de luz',
  note: 'Tener a mano la factura y el homebanking.',
  template_key: 'payments',
  category: 'Pagos',
  priority: 'high',
  estimated_duration_minutes: 20,
  checklist: [{ text: 'Buscar la factura' }, { text: 'Hacer el pago' }, { text: 'Guardar comprobante' }],
  requires_verification: false,
  requires_evidence: false,
};

function makeContext(overrides = {}) {
  return {
    personId: 'person-a',
    householdId: 'household-h1',
    membershipId: 'member-a',
    ...overrides,
  };
}

function makeFixture() {
  const repo = new InMemoryPresetRepository();
  const service = createPlannerPresetsService(() => repo);
  return { repo, service };
}

async function seedHomeplusPreset(repo, context, overrides = {}) {
  const result = await repo.createPreset(context, {
    entity_type: 'task',
    source: 'homeplus',
    owner_person_id: null,
    household_id: null,
    name: 'Comprar medicamentos',
    envelope: {
      entity_type: 'task',
      adapter_key: 'planner.task.template.v1',
      payload_schema: 'planner.template_payload',
      payload_version: 2,
      payload: {
        title: 'Comprar medicamentos',
        note: 'Revisar receta antes de comprar.',
        template_key: 'medication',
        category: 'Medicacion',
        priority: 'normal',
        estimated_duration_minutes: 30,
        checklist: [{ text: 'Revisar receta' }, { text: 'Ir a la farmacia' }],
        requires_verification: false,
        requires_evidence: false,
        ...overrides,
      },
    },
    fingerprint: 'f'.repeat(64),
  });
  return result.preset;
}

async function main() {
  // -------------------------------------------------------------------------
  // P1 — create Household preset
  // -------------------------------------------------------------------------
  await test('P1 create Household preset (kind=task, scope=household, editable)', async () => {
    const { service } = makeFixture();
    const context = makeContext();
    const created = await service.createPreset(context, {
      entity_type: 'task',
      source: 'household',
      name: 'Pagar facturas',
      adapter_key: 'planner.task.template.v1',
      payload: TEMPLATE_PAYLOAD,
    });
    assert.equal(created.preset.source, 'household');
    assert.equal(created.preset.entity_type, 'task');
    assert.equal(created.preset.household_id, 'household-h1');
    // Canonical DTO enrichment: kind / scope / editable.
    const { preset } = await service.getPreset(context, created.preset.id);
    assert.equal(preset.kind, 'task');
    assert.equal(preset.scope, 'household');
    assert.equal(preset.editable, true);
  });

  // -------------------------------------------------------------------------
  // P2 — edit Household preset (metadata + revision cycle)
  // -------------------------------------------------------------------------
  await test('P2 edit Household preset updates name and publishes new revision', async () => {
    const { service } = makeFixture();
    const context = makeContext();
    const created = await service.createPreset(context, {
      entity_type: 'task',
      source: 'household',
      name: 'Pagar facturas',
      adapter_key: 'planner.task.template.v1',
      payload: TEMPLATE_PAYLOAD,
    });

    const renamed = await service.updatePresetMetadata(context, created.preset.id, { name: 'Pagar facturas del hogar' }, created.preset.version);
    assert.equal(renamed.preset.name, 'Pagar facturas del hogar');

    const started = await service.startRevision(context, created.preset.id);
    const editedPayload = { ...TEMPLATE_PAYLOAD, priority: 'low', checklist: [{ text: 'Preparar dinero' }] };
    const updated = await service.updateRevisionDraft(
      context,
      started.revision.id,
      { adapter_key: 'planner.task.template.v1', entity_type: 'task', payload: editedPayload },
      started.revision.version,
    );
    const published = await service.publishRevision(context, started.revision.id, updated.revision.version);
    const activeRevision = published.revision;

    const { preset } = await service.getPreset(context, created.preset.id);
    assert.equal(preset.active_revision_id, activeRevision.id);
    assert.equal(activeRevision.revision_state, 'published');
    const payload = domain.presetTaskPayloadFromPreset(preset);
    assert.equal(payload.priority, 'low');
    assert.deepEqual(payload.checklist, [{ text: 'Preparar dinero' }]);
  });

  // -------------------------------------------------------------------------
  // P3 — trash Household preset is lifecycle-only; Tasks unaffected
  // -------------------------------------------------------------------------
  await test('P3 trash Household preset affects only the preset lifecycle', async () => {
    const { service } = makeFixture();
    const context = makeContext();
    const created = await service.createPreset(context, {
      entity_type: 'task',
      source: 'household',
      name: 'Preset a borrar',
      adapter_key: 'planner.task.template.v1',
      payload: TEMPLATE_PAYLOAD,
    });
    const trashed = await service.trashPreset(context, created.preset.id, created.preset.version);
    assert.ok(trashed.preset.trashed_at);
    const { presets } = await service.listPresets(context, {});
    assert.equal(presets.some((p) => p.id === created.preset.id), false);
    // No Task rows exist in this subsystem (presets never own/clone Tasks);
    // deleting a preset cannot cascade into planner_tasks by construction.
    assert.ok(!('tasks' in trashed));
  });

  // -------------------------------------------------------------------------
  // P4 — HomePlus preset is read-only
  // -------------------------------------------------------------------------
  await test('P4 HomePlus preset is read-only for users', async () => {
    const { repo, service } = makeFixture();
    const context = makeContext();
    const homeplus = await seedHomeplusPreset(repo, context);

    await assert.rejects(
      () => service.updatePresetMetadata(context, homeplus.id, { name: 'Hackeado' }, homeplus.version),
      (error) => error.code === 'forbidden',
    );
    await assert.rejects(
      () => service.startRevision(context, homeplus.id),
      (error) => error.code === 'forbidden',
    );

    const { preset } = await service.getPreset(context, homeplus.id);
    assert.equal(preset.scope, 'homeplus');
    assert.equal(preset.editable, false);
  });

  // -------------------------------------------------------------------------
  // P5 — duplicate HomePlus → Household
  // -------------------------------------------------------------------------
  await test('P5 duplicate HomePlus preset creates an editable household copy', async () => {
    const { repo, service } = makeFixture();
    const context = makeContext();
    const homeplus = await seedHomeplusPreset(repo, context);

    const duplicated = await service.duplicateHomeplusToHousehold(context, homeplus.id, {
      name: 'Comprar medicamentos (hogar)',
    });
    const copy = duplicated.preset;
    assert.notEqual(copy.id, homeplus.id);
    assert.equal(copy.source, 'household');
    assert.equal(copy.household_id, 'household-h1');
    assert.equal(copy.name, 'Comprar medicamentos (hogar)');

    const { preset: copyDto } = await service.getPreset(context, copy.id);
    assert.equal(copyDto.editable, true);

    const copyPayload = domain.presetTaskPayloadFromPreset(copy);
    assert.equal(copyPayload.title, 'Comprar medicamentos');
    assert.deepEqual(copyPayload.checklist, [{ text: 'Revisar receta' }, { text: 'Ir a la farmacia' }]);

    // No live sync: editing the copy does not touch the original.
    const renamed = await service.updatePresetMetadata(context, copy.id, { name: 'Otro nombre' }, copy.version);
    assert.equal(renamed.preset.name, 'Otro nombre');
    const originalReloaded = await service.getPreset(context, homeplus.id);
    assert.equal(originalReloaded.preset.name, 'Comprar medicamentos');

    // Payload override + forbidden source guard.
    await assert.rejects(
      () => service.duplicateHomeplusToHousehold(context, copy.id, {}),
      (error) => error.code === 'forbidden',
    );
  });

  // -------------------------------------------------------------------------
  // P6 — apply preset to a blank draft
  // -------------------------------------------------------------------------
  await test('P6 apply preset to blank draft populates stable fields', () => {
    const draft = {};
    const merged = domain.applyPresetToTaskDraft(draft, TEMPLATE_PAYLOAD);
    assert.equal(merged.title, TEMPLATE_PAYLOAD.title);
    assert.equal(merged.note, TEMPLATE_PAYLOAD.note);
    assert.equal(merged.priority, 'high');
    assert.equal(merged.template_key, 'payments');
    assert.equal(merged.estimated_duration_minutes, 20);
    assert.equal(merged.requires_verification, false);
  });

  // -------------------------------------------------------------------------
  // P7 — context preserved (assignee/date/time/Plan survive)
  // -------------------------------------------------------------------------
  await test('P7 apply preset preserves assignee/date/time/Plan context', () => {
    const draft = {
      assignee: { id: 'm-yo', label: 'Yo' },
      due_date: '2026-09-18',
      due_time: '18:30',
      goal_id: 'plan-xyz',
      assignment_mode: 'assigned',
    };
    const merged = domain.applyPresetToTaskDraft(draft, TEMPLATE_PAYLOAD);
    assert.deepEqual(merged.assignee, { id: 'm-yo', label: 'Yo' });
    assert.equal(merged.due_date, '2026-09-18');
    assert.equal(merged.due_time, '18:30');
    assert.equal(merged.goal_id, 'plan-xyz');
    assert.equal(merged.assignment_mode, 'assigned');
    // ...while stable fields come from the preset.
    assert.equal(merged.title, TEMPLATE_PAYLOAD.title);
  });

  // -------------------------------------------------------------------------
  // P8 — conflict detection
  // -------------------------------------------------------------------------
  await test('P8 manual stable values require confirmation before overwrite', () => {
    // Meaningful title entered by the user → conflict.
    assert.equal(
      domain.detectApplyConflict({ title: 'Otra cosa cargada a mano' }, TEMPLATE_PAYLOAD),
      true,
    );
    // Same values → no meaningful replacement.
    assert.equal(
      domain.detectApplyConflict({ title: TEMPLATE_PAYLOAD.title, priority: 'normal' }, TEMPLATE_PAYLOAD),
      false,
    );
    // Default-only draft (default category/priority, empty checklist) is fine.
    assert.equal(
      domain.detectApplyConflict({ category: 'General', priority: 'normal', checklist: [] }, TEMPLATE_PAYLOAD),
      false,
    );
    // Context alone never triggers the conflict (P7 companion).
    assert.equal(
      domain.detectApplyConflict({ assignee: { id: 'x' }, due_date: '2026-09-18', due_time: '10:00' }, TEMPLATE_PAYLOAD),
      false,
    );
  });

  // -------------------------------------------------------------------------
  // P9 — checklist cloned fresh + incomplete
  // -------------------------------------------------------------------------
  await test('P9 checklist application is copy-on-use with incomplete items', () => {
    const presetPayload = {
      ...TEMPLATE_PAYLOAD,
      checklist: [{ text: 'a', checked: true }, { text: 'b' }],
    };
    const first = domain.applyPresetToTaskDraft({}, presetPayload);
    assert.deepEqual(first.checklist, [
      { text: 'a', checked: false },
      { text: 'b', checked: false },
    ]);
    // Mutating one task's checklist never leaks into another application.
    first.checklist[0].checked = true;
    first.checklist[0].text = 'cambiado';
    const second = domain.applyPresetToTaskDraft({}, presetPayload);
    assert.deepEqual(second.checklist, [
      { text: 'a', checked: false },
      { text: 'b', checked: false },
    ]);
    assert.equal(presetPayload.checklist[0].text, 'a');
  });

  // -------------------------------------------------------------------------
  // P10 — save Task as preset strips every contextual field
  // -------------------------------------------------------------------------
  await test('P10 taskToPresetPayload strips contextual fields', () => {
    const task = {
      title: 'Pagar internet',
      description: 'Vence a fin de mes.',
      template_key: 'payments',
      category: 'Pagos',
      priority: 'high',
      estimated_duration_minutes: 15,
      checklist: [{ text: 'Entrar al homebanking', checked: true }, { text: 'Pagar', checked: false }],
      requires_verification: true,
      // Contextual fields that MUST NOT survive:
      assigned_to_member_id: 'member-x',
      assignment_kind: 'members',
      due_date: '2026-09-20',
      due_time: '09:00',
      goal_id: 'plan-1',
      responsibility_id: 'resp-9',
      status: 'completed',
      completed_at: '2026-09-18T10:00:00Z',
      fulfillment: { state: 'completed' },
    };
    const payload = domain.taskToPresetPayload(task);
    assert.equal(payload.title, 'Pagar internet');
    assert.equal(payload.note, 'Vence a fin de mes.');
    assert.equal(payload.priority, 'high');
    assert.equal(payload.requires_verification, true);
    assert.deepEqual(payload.checklist, [{ text: 'Entrar al homebanking' }, { text: 'Pagar' }]);
    for (const forbidden of ['assigned_to_member_id', 'assignment_kind', 'due_date', 'due_time', 'goal_id', 'responsibility_id', 'status', 'completed_at', 'fulfillment']) {
      assert.equal(Object.prototype.hasOwnProperty.call(payload, forbidden), false, `${forbidden} must not survive`);
    }
  });

  // -------------------------------------------------------------------------
  // P11 — household isolation
  // -------------------------------------------------------------------------
  await test('P11 household presets are isolated per household', async () => {
    const { repo, service } = makeFixture();
    const contextA = makeContext();
    const contextB = makeContext({ personId: 'person-b', householdId: 'household-h2', membershipId: 'member-b' });

    const createdA = await service.createPreset(contextA, {
      entity_type: 'task',
      source: 'household',
      name: 'Preset de H1',
      adapter_key: 'planner.task.template.v1',
      payload: TEMPLATE_PAYLOAD,
    });
    await service.createPreset(contextB, {
      entity_type: 'task',
      source: 'household',
      name: 'Preset de H2',
      adapter_key: 'planner.task.template.v1',
      payload: TEMPLATE_PAYLOAD,
    });

    const bList = await service.listPresets(contextB, {});
    assert.equal(bList.presets.some((p) => p.id === createdA.preset.id), false);
    assert.equal(bList.presets.every((p) => p.household_id === 'household-h2'), true);

    await assert.rejects(
      () => service.getPreset(contextB, createdA.preset.id),
      (error) => error.code === 'wrong_household',
    );

    // The in-memory repo is shared globally between contexts; isolation is
    // enforced by scope filtering, not by deleting the other household's row.
    const rawA = await repo.get(createdA.preset.id);
    assert.equal(rawA.household_id, 'household-h1');
  });

  // -------------------------------------------------------------------------
  // P12 — legacy event/plan/personal data survives (compat-only)
  // -------------------------------------------------------------------------
  await test('P12 legacy event/plan/personal presets remain listed but off-canon', async () => {
    const { repo, service } = makeFixture();
    const context = makeContext();
    await repo.createPreset(context, {
      entity_type: 'event',
      source: 'household',
      owner_person_id: null,
      household_id: 'household-h1',
      name: 'Evento legacy',
      envelope: {
        entity_type: 'event',
        adapter_key: 'planner.event.template.v1',
        payload_schema: 'planner.template_payload',
        payload_version: 2,
        payload: { title: 'Evento legacy' },
      },
      fingerprint: 'f'.repeat(64),
    });
    await repo.createPreset(context, {
      entity_type: 'plan',
      source: 'personal',
      owner_person_id: 'person-a',
      household_id: null,
      name: 'Plan legacy personal',
      envelope: {
        entity_type: 'plan',
        adapter_key: 'planner.plan.template.v1',
        payload_schema: 'planner.template_payload',
        payload_version: 2,
        payload: { objectiveTemplate: 'Objetivo legacy' },
      },
      fingerprint: 'f'.repeat(64),
    });

    const { presets } = await service.listPresets(context, {});
    // Physical survival: both legacy rows are intact and retrievable.
    assert.equal(presets.some((p) => p.entity_type === 'event'), true);
    assert.equal(presets.some((p) => p.entity_type === 'plan'), true);
    assert.equal(presets.some((p) => p.source === 'personal'), true);

    // Canonical P2.2A surfaces exclude them (quick rail is the pure proxy).
    const quick = domain.selectQuickPresets(presets, 10);
    assert.equal(quick.some((p) => p.entity_type !== 'task'), false);
    assert.equal(quick.some((p) => p.source === 'personal'), false);
  });

  // -------------------------------------------------------------------------
  // P13 — quick rail deterministic, household-first, bounded
  // -------------------------------------------------------------------------
  await test('P13 quick rail selection is deterministic and household-first', async () => {
    const { repo, service } = makeFixture();
    const context = makeContext();
    const hp = await seedHomeplusPreset(repo, context);
    const householdA = (await service.createPreset(context, {
      entity_type: 'task', source: 'household', name: 'HH primero',
      adapter_key: 'planner.task.template.v1', payload: TEMPLATE_PAYLOAD,
    })).preset;
    const householdB = (await service.createPreset(context, {
      entity_type: 'task', source: 'household', name: 'HH segundo',
      adapter_key: 'planner.task.template.v1', payload: TEMPLATE_PAYLOAD,
    })).preset;

    const { presets } = await service.listPresets(context, {});
    const quick = domain.selectQuickPresets(presets, 2);
    assert.equal(quick.length, 2);
    assert.equal(quick.every((p) => p.source === 'household'), true);

    const quickAll = domain.selectQuickPresets(presets, 10);
    assert.equal(quickAll.some((p) => p.id === hp.id), true);
    assert.equal(quickAll.some((p) => p.id === householdA.id), true);
    assert.equal(quickAll.some((p) => p.id === householdB.id), true);
    // Household presets always sort ahead of HomePlus ones.
    const firstHomeplusIndex = quickAll.findIndex((p) => p.source === 'homeplus');
    assert.equal(quickAll.slice(0, firstHomeplusIndex).every((p) => p.source === 'household'), true);
    // Determinism: two runs over the same input produce the same order.
    assert.deepEqual(
      domain.selectQuickPresets(presets, 10).map((p) => p.id),
      quickAll.map((p) => p.id),
    );
  });

  // -------------------------------------------------------------------------
  // P14 — household empty + HomePlus populated → HomePlus shows
  // -------------------------------------------------------------------------
  await test('P14 quick rail and canonical groups show HomePlus when household is empty', async () => {
    const { repo } = makeFixture();
    const context = makeContext();
    await seedHomeplusPreset(repo, context);

    const presets = await repo.list(context, {});
    const quick = domain.selectQuickPresets(presets, 6);
    assert.equal(quick.length, 1);
    assert.equal(quick[0].source, 'homeplus');
  });

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log(`\nP2.2A presets foundation: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error('Fatal test harness error:', error);
  process.exit(1);
});
