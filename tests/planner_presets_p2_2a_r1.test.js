'use strict';

/**
 * P2.2A-R1 — Preset runtime stabilization — focused tests.
 *
 * Causa raíz del defecto 3: `applyPresetToTaskDraft` escribía de forma
 * condicional (solo valores truthy / duración no-null), de modo que un preset
 * con Tipo General (template_key null), nota vacía o duración null NO
 * limpiaba el valor previo. El caso exacto: category 'General' sí
 * sobreescribía pero template_key null no, y el form prioriza template_key →
 * el Tipo quedaba clavado en el preset anterior.
 *
 * Contrato R1 verificado aquí:
 *   1. A → B → A determinístico (todos los estables)
 *   2. type siempre sigue al preset (incl. General que limpia)
 *   3. priority sigue al preset (incl. normal que limpia high)
 *   4. note sigue al preset (incl. vacía que limpia)
 *   5. duration sigue al preset (incl. null que limpia)
 *   6. checklist sigue al preset (incl. vacía que limpia)
 *   7-9. contexto (assignee/date/time/Plan) sobrevive
 *   10. checklist se clona unchecked, sin leaks entre aplicaciones
 *   11. create Household → list incluye Household
 *   12. duplicate HomePlus → Household list
 *   13. save Task → Preset elimina contextuales
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

const PRESET_A = {
  title: 'Hacer una compra',
  note: 'Nota de compra.',
  template_key: 'shopping',
  category: 'Compras',
  priority: 'high',
  estimated_duration_minutes: 20,
  checklist: [{ text: 'Pan' }, { text: 'Leche' }],
  requires_verification: true,
  requires_evidence: false,
};

const PRESET_B = {
  title: 'Pagar una factura',
  note: 'Nota de pago.',
  template_key: 'payments',
  category: 'Pagos',
  priority: 'low',
  estimated_duration_minutes: 45,
  checklist: [{ text: 'Buscar factura' }],
  requires_verification: false,
  requires_evidence: false,
};

const PRESET_GENERAL = {
  title: 'Anotar pendiente',
  note: '',
  template_key: null,
  category: 'General',
  priority: 'normal',
  estimated_duration_minutes: null,
  checklist: [],
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

async function main() {
  // -------------------------------------------------------------------------
  // R1.1 — A → B → A determinístico (todos los estables)
  // -------------------------------------------------------------------------
  await test('R1.1 apply A → B → A es determinístico en todos los estables', () => {
    const first = domain.applyPresetToTaskDraft({}, PRESET_A);
    const second = domain.applyPresetToTaskDraft(first, PRESET_B);
    const third = domain.applyPresetToTaskDraft(second, PRESET_A);
    assert.deepEqual(third, first);
    assert.equal(third.title, 'Hacer una compra');
    assert.equal(third.template_key, 'shopping');
    assert.equal(third.category, 'Compras');
  });

  // -------------------------------------------------------------------------
  // R1.2 — type siempre sigue al preset (incl. General que limpia)
  // -------------------------------------------------------------------------
  await test('R1.2 type sigue al preset incluso cuando el nuevo es General', () => {
    const appliedB = domain.applyPresetToTaskDraft(
      domain.applyPresetToTaskDraft({}, PRESET_A),
      PRESET_B,
    );
    assert.equal(appliedB.template_key, 'payments');
    assert.equal(appliedB.category, 'Pagos');
    const backToGeneral = domain.applyPresetToTaskDraft(appliedB, PRESET_GENERAL);
    assert.equal(backToGeneral.template_key, null);
    assert.equal(backToGeneral.category, 'General');
  });

  // -------------------------------------------------------------------------
  // R1.3 — priority sigue al preset (incl. normal que limpia high)
  // -------------------------------------------------------------------------
  await test('R1.3 priority sigue al preset incluso al volver a normal', () => {
    const high = domain.applyPresetToTaskDraft({}, PRESET_A);
    assert.equal(high.priority, 'high');
    const backToNormal = domain.applyPresetToTaskDraft(high, PRESET_GENERAL);
    assert.equal(backToNormal.priority, 'normal');
  });

  // -------------------------------------------------------------------------
  // R1.4 — note sigue al preset (incl. vacía que limpia)
  // -------------------------------------------------------------------------
  await test('R1.4 note sigue al preset incluso cuando la nueva es vacía', () => {
    const withNote = domain.applyPresetToTaskDraft({}, PRESET_A);
    assert.equal(withNote.note, 'Nota de compra.');
    const cleared = domain.applyPresetToTaskDraft(withNote, PRESET_GENERAL);
    assert.equal(cleared.note, '');
  });

  // -------------------------------------------------------------------------
  // R1.5 — duration sigue al preset (incl. null que limpia)
  // -------------------------------------------------------------------------
  await test('R1.5 duration sigue al preset incluso cuando la nueva es null', () => {
    const withDuration = domain.applyPresetToTaskDraft({}, PRESET_A);
    assert.equal(withDuration.estimated_duration_minutes, 20);
    const changed = domain.applyPresetToTaskDraft(withDuration, PRESET_B);
    assert.equal(changed.estimated_duration_minutes, 45);
    const cleared = domain.applyPresetToTaskDraft(changed, PRESET_GENERAL);
    assert.equal(cleared.estimated_duration_minutes, null);
  });

  // -------------------------------------------------------------------------
  // R1.6 — checklist sigue al preset (incl. vacía que limpia)
  // -------------------------------------------------------------------------
  await test('R1.6 checklist sigue al preset incluso cuando la nueva es vacía', () => {
    const withChecklist = domain.applyPresetToTaskDraft({}, PRESET_A);
    assert.deepEqual(withChecklist.checklist, [
      { text: 'Pan', checked: false },
      { text: 'Leche', checked: false },
    ]);
    const changed = domain.applyPresetToTaskDraft(withChecklist, PRESET_B);
    assert.deepEqual(changed.checklist, [{ text: 'Buscar factura', checked: false }]);
    const cleared = domain.applyPresetToTaskDraft(changed, PRESET_GENERAL);
    assert.deepEqual(cleared.checklist, []);
  });

  // -------------------------------------------------------------------------
  // R1.7-9 — contexto sobrevive (assignee/date/time/Plan)
  // -------------------------------------------------------------------------
  await test('R1.7-9 assignee/date/time/Plan sobreviven a A → B → A', () => {
    const draft = {
      assignee: { id: 'm-yo', label: 'Yo' },
      due_date: '2026-09-22',
      due_time: '18:30',
      goal_id: 'plan-xyz',
      assignment_mode: 'assigned',
    };
    const a = domain.applyPresetToTaskDraft(draft, PRESET_A);
    const b = domain.applyPresetToTaskDraft(a, PRESET_B);
    const again = domain.applyPresetToTaskDraft(b, PRESET_A);
    for (const snapshot of [a, b, again]) {
      assert.deepEqual(snapshot.assignee, { id: 'm-yo', label: 'Yo' });
      assert.equal(snapshot.due_date, '2026-09-22');
      assert.equal(snapshot.due_time, '18:30');
      assert.equal(snapshot.goal_id, 'plan-xyz');
      assert.equal(snapshot.assignment_mode, 'assigned');
    }
    assert.equal(again.title, PRESET_A.title);
  });

  // -------------------------------------------------------------------------
  // R1.10 — checklist se clona unchecked, sin leaks
  // -------------------------------------------------------------------------
  await test('R1.10 checklist siempre inicia unchecked y no filtra estado', () => {
    const dirty = { ...PRESET_A, checklist: [{ text: 'x', checked: true }] };
    const first = domain.applyPresetToTaskDraft({}, dirty);
    assert.deepEqual(first.checklist, [{ text: 'x', checked: false }]);
    first.checklist[0].checked = true;
    first.checklist[0].text = 'mutado';
    const second = domain.applyPresetToTaskDraft({}, dirty);
    assert.deepEqual(second.checklist, [{ text: 'x', checked: false }]);
  });

  // -------------------------------------------------------------------------
  // R1.11 — create Household → list incluye Household
  // -------------------------------------------------------------------------
  await test('R1.11 crear preset del hogar aparece en el listado', async () => {
    const { service } = makeFixture();
    const context = makeContext();
    const created = await service.createPreset(context, {
      entity_type: 'task',
      source: 'household',
      name: 'Limpiar la casa',
      adapter_key: 'planner.task.template.v1',
      payload: {
        ...PRESET_A,
        title: 'Limpiar la casa',
        checklist: [{ text: 'Barrer' }, { text: 'Pasar el trapo' }, { text: 'Limpiar muebles' }],
      },
    });
    const { presets } = await service.listPresets(context, {});
    const found = presets.find((p) => p.id === created.preset.id);
    assert.ok(found, 'el preset creado debe estar en el listado');
    assert.equal(found.scope, 'household');
    const householdOnly = presets.filter((p) => p.scope === 'household' && p.entity_type === 'task');
    assert.ok(householdOnly.some((p) => p.name === 'Limpiar la casa'));
  });

  // -------------------------------------------------------------------------
  // R1.12 — duplicate HomePlus → Household list
  // -------------------------------------------------------------------------
  await test('R1.12 duplicar HomePlus crea copia editable visible en el hogar', async () => {
    const { repo, service } = makeFixture();
    const context = makeContext();
    const homeplus = await repo.createPreset(context, {
      entity_type: 'task',
      source: 'homeplus',
      owner_person_id: null,
      household_id: null,
      name: 'Hacer una compra',
      envelope: {
        entity_type: 'task',
        adapter_key: 'planner.task.template.v1',
        payload_schema: 'planner.template_payload',
        payload_version: 2,
        payload: PRESET_A,
      },
      fingerprint: 'f'.repeat(64),
    });
    const duplicated = await service.duplicateHomeplusToHousehold(context, homeplus.preset.id, {});
    assert.equal(duplicated.preset.source, 'household');
    const { presets } = await service.listPresets(context, {});
    assert.ok(presets.some((p) => p.id === duplicated.preset.id && p.scope === 'household'));
    const { preset: dto } = await service.getPreset(context, duplicated.preset.id);
    assert.equal(dto.editable, true);
  });

  // -------------------------------------------------------------------------
  // R1.13 — save Task → Preset elimina contextuales
  // -------------------------------------------------------------------------
  await test('R1.13 taskToPresetPayload elimina assignee/fecha/hora/Plan/estado', () => {
    const payload = domain.taskToPresetPayload({
      title: 'Pagar internet',
      description: 'Vence a fin de mes.',
      template_key: 'payments',
      category: 'Pagos',
      priority: 'high',
      estimated_duration_minutes: 15,
      checklist: [{ text: 'Entrar al homebanking', checked: true }],
      requires_verification: true,
      assigned_to_member_id: 'member-x',
      due_date: '2026-09-22',
      due_time: '09:00',
      goal_id: 'plan-1',
      responsibility_id: 'resp-9',
      status: 'completed',
    });
    assert.equal(payload.title, 'Pagar internet');
    assert.deepEqual(payload.checklist, [{ text: 'Entrar al homebanking' }]);
    for (const forbidden of [
      'assigned_to_member_id', 'due_date', 'due_time', 'goal_id',
      'responsibility_id', 'status',
    ]) {
      assert.equal(Object.prototype.hasOwnProperty.call(payload, forbidden), false, `${forbidden} no debe sobrevivir`);
    }
  });

  console.log(`\nP2.2A-R1 presets runtime: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error('Fatal test harness error:', error);
  process.exit(1);
});
