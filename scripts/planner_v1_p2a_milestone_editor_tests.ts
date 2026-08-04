import { ok } from 'node:assert';

import {
  buildMilestoneEditorDraft,
  addMilestoneToDraft,
  updateMilestoneInDraft,
  removeMilestoneFromDraft,
  moveMilestoneUp,
  moveMilestoneDown,
  buildMilestoneChangeset,
  hasDraftChanges,
  draftMilestoneCount,
  validateMilestoneEntry,
  resetLocalIdSeq,
} from '../front/mi-front-limpio/services/planner/planMilestoneEditor';
import { toPlanStructureSnapshot, projectActivationReadiness } from '../front/mi-front-limpio/services/planner/planStructureContract';
import { createPlanWriteSingleFlightGate } from '../front/mi-front-limpio/services/planner/planWriteSingleFlight';
import type { PlanStructureSnapshot } from '../front/mi-front-limpio/types/PlannerPlan';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ok ${message}`);
    passCount += 1;
  } else {
    console.error(`  fail ${message}`);
    failCount += 1;
  }
}

function runTest(name: string, fn: () => void): void {
  console.log(`\n=== ${name} ===`);
  try {
    fn();
  } catch (error) {
    console.error(`  threw ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
    failCount += 1;
  }
}

const planId = '11111111-1111-4111-8111-111111111111';
const msId1 = '22222222-2222-4222-8222-222222222222';
const msId2 = '33333333-3333-4333-8333-333333333333';

function emptySnapshot(): PlanStructureSnapshot {
  return toPlanStructureSnapshot({
    plan: { id: planId, version: 1, scope: 'personal', household_id: null, objective: 'Test', description: null, lifecycle: 'draft', target_date: null, finalization_kind: 'none', archived_at: null, trashed_at: null, created_at: '2026-08-04T00:00:00Z', updated_at: '2026-08-04T00:00:00Z', availableActions: ['activate'] },
    indicators: { milestone_count: 0, completed_milestone_count: 0, measurement_count: 0, reached_measurement_count: 0, necessary_requirement_count: 0, satisfied_necessary_requirement_count: 0, supporting_requirement_count: 0 },
    milestones: [],
    measurements: [],
    manualConditions: [],
    requirements: [],
    draftIsolation: { contained: true, operationalChildrenPublished: false, appearsInHome: false, notifies: false, recurs: false },
  });
}

function oneMilestoneSnapshot(): PlanStructureSnapshot {
  return toPlanStructureSnapshot({
    plan: { id: planId, version: 1, scope: 'personal', household_id: null, objective: 'build', description: null, lifecycle: 'draft', target_date: null, finalization_kind: 'none', archived_at: null, trashed_at: null, created_at: '2026-08-04T00:00:00Z', updated_at: '2026-08-04T00:00:00Z', availableActions: ['activate'] },
    indicators: { milestone_count: 1, completed_milestone_count: 0, measurement_count: 0, reached_measurement_count: 0, necessary_requirement_count: 0, satisfied_necessary_requirement_count: 0, supporting_requirement_count: 0 },
    milestones: [{ id: msId1, plan_id: planId, version: 1, title: 'Hito A', description: null, completion_mode: 'manual', lifecycle: 'pending', classification: 'necessary', sort_order: 0 }],
    measurements: [],
    manualConditions: [],
    requirements: [],
    draftIsolation: { contained: true, operationalChildrenPublished: false, appearsInHome: false, notifies: false, recurs: false },
  });
}

function twoMilestoneSnapshot(): PlanStructureSnapshot {
  return toPlanStructureSnapshot({
    plan: { id: planId, version: 1, scope: 'personal', household_id: null, objective: 'dual', description: null, lifecycle: 'draft', target_date: null, finalization_kind: 'none', archived_at: null, trashed_at: null, created_at: '2026-08-04T00:00:00Z', updated_at: '2026-08-04T00:00:00Z', availableActions: ['activate'] },
    indicators: { milestone_count: 2, completed_milestone_count: 0, measurement_count: 0, reached_measurement_count: 0, necessary_requirement_count: 0, satisfied_necessary_requirement_count: 0, supporting_requirement_count: 0 },
    milestones: [
      { id: msId1, plan_id: planId, version: 1, title: 'Hito 1', description: null, completion_mode: 'manual', lifecycle: 'pending', classification: 'necessary', sort_order: 0 },
      { id: msId2, plan_id: planId, version: 1, title: 'Hito 2', description: null, completion_mode: 'manual', lifecycle: 'pending', classification: 'supporting', sort_order: 1 },
    ],
    measurements: [],
    manualConditions: [],
    requirements: [],
    draftIsolation: { contained: true, operationalChildrenPublished: false, appearsInHome: false, notifies: false, recurs: false },
  });
}

runTest('1. snapshot with zero milestones produces empty draft', () => {
  const snap = emptySnapshot();
  const draft = buildMilestoneEditorDraft(snap);
  assert(draft.entries.length === 0, 'draft entries is empty');
  assert(draft.planId === planId, 'planId matches');
  assert(draft.baseVersion === 1, 'baseVersion matches');
});

runTest('2. add a milestone to draft', () => {
  resetLocalIdSeq(0);
  const snap = emptySnapshot();
  const draft = buildMilestoneEditorDraft(snap);
  assert(draft.entries.length === 0, 'starts empty');

  const updated = addMilestoneToDraft(draft, { title: 'Primer hito', completionMode: 'manual' });
  assert(updated.entries.length === 1, 'now has 1 entry');
  assert(updated.entries[0].title === 'Primer hito', 'title set');
  assert(updated.entries[0].completionMode === 'manual', 'completionMode set');
  assert(updated.entries[0].sortOrder === 0, 'sortOrder auto assigned');
});

runTest('3. edit a milestone in draft', () => {
  resetLocalIdSeq(0);
  const snap = emptySnapshot();
  const draft = buildMilestoneEditorDraft(snap);
  const withMs = addMilestoneToDraft(draft, { title: 'Original', completionMode: 'manual' });
  const localId = withMs.entries[0].localId;

  const edited = updateMilestoneInDraft(withMs, localId, { title: 'Editado', completionMode: 'automatic' });
  assert(edited.entries[0].title === 'Editado', 'title updated');
  assert(edited.entries[0].completionMode === 'automatic', 'completionMode updated');
  assert(edited.entries[0].localId === localId, 'localId preserved');
});

runTest('4. remove new milestone (not yet persisted)', () => {
  resetLocalIdSeq(0);
  const snap = emptySnapshot();
  const draft = buildMilestoneEditorDraft(snap);
  const withMs = addMilestoneToDraft(draft, { title: 'Para eliminar', completionMode: 'manual' });
  const localId = withMs.entries[0].localId;

  const removed = removeMilestoneFromDraft(withMs, localId);
  assert(removed.entries.length === 0, 'draft back to zero');
});

runTest('5. remove persisted milestone produces trash operation', () => {
  const snap = oneMilestoneSnapshot();
  const draft = buildMilestoneEditorDraft(snap);
  assert(draft.entries.length === 1, 'has one persisted milestone');

  const changeset = buildMilestoneChangeset({ ...draft, entries: [] });
  assert(changeset !== null, 'changeset generated');
  assert(changeset !== null && changeset.operations.length === 1, 'one operation');
  assert(
    changeset !== null && changeset.operations[0].operation === 'trash',
    'operation is trash',
  );
});

runTest('6. reorder: move up and down', () => {
  resetLocalIdSeq(0);
  const snap = emptySnapshot();
  let draft = buildMilestoneEditorDraft(snap);
  draft = addMilestoneToDraft(draft, { title: 'Hito 1', completionMode: 'manual' });
  draft = addMilestoneToDraft(draft, { title: 'Hito 2', completionMode: 'manual' });
  draft = addMilestoneToDraft(draft, { title: 'Hito 3', completionMode: 'manual' });

  assert(draft.entries[0].title === 'Hito 1', 'initial order: Hito 1 first');
  assert(draft.entries[1].title === 'Hito 2', 'initial order: Hito 2 second');
  assert(draft.entries[2].title === 'Hito 3', 'initial order: Hito 3 third');

  const movedUp = moveMilestoneUp(draft, draft.entries[2].localId);
  assert(movedUp.entries[1].title === 'Hito 3', 'Hito 3 moved up to position 1');

  const movedDown = moveMilestoneDown(movedUp, movedUp.entries[0].localId);
  assert(movedDown.entries[1].title === 'Hito 1', 'Hito 1 now at position 1');
});

runTest('7. reorder produces stable sortOrders', () => {
  resetLocalIdSeq(0);
  const snap = emptySnapshot();
  let draft = buildMilestoneEditorDraft(snap);
  draft = addMilestoneToDraft(draft, { title: 'A', completionMode: 'manual' });
  draft = addMilestoneToDraft(draft, { title: 'B', completionMode: 'manual' });
  draft = addMilestoneToDraft(draft, { title: 'C', completionMode: 'manual' });

  const swapped = moveMilestoneUp(draft, draft.entries[1].localId);
  assert(swapped.entries[0].sortOrder === 0, 'stable: order 0');
  assert(swapped.entries[1].sortOrder === 1, 'stable: order 1');
  assert(swapped.entries[2].sortOrder === 2, 'stable: order 2');
});

runTest('8. draft does not mutate snapshot', () => {
  const snap = oneMilestoneSnapshot();
  const snapBefore = JSON.stringify(snap.milestones);
  const draft = buildMilestoneEditorDraft(snap);
  void updateMilestoneInDraft(draft, draft.entries[0].localId, { title: 'Mutado' });
  const snapAfter = JSON.stringify(snap.milestones);
  assert(snapBefore === snapAfter, 'snapshot remains untouched');
});

runTest('9. changeset is minimal', () => {
  const snap = oneMilestoneSnapshot();
  const draft = buildMilestoneEditorDraft(snap);
  const edited = updateMilestoneInDraft(draft, draft.entries[0].localId, { title: 'Cambiado' });

  const changeset = buildMilestoneChangeset(edited);
  assert(changeset !== null, 'changeset exists');
  assert(changeset !== null && changeset.operations.length === 1, 'exactly one operation');
  assert(changeset !== null && changeset.operations[0].operation === 'update', 'only needed operation is update');
});

runTest('10. no changes produces null changeset (noop)', () => {
  const snap = oneMilestoneSnapshot();
  const draft = buildMilestoneEditorDraft(snap);
  const changeset = buildMilestoneChangeset(draft);
  assert(changeset === null, 'null changeset for no changes');
  assert(!hasDraftChanges(draft), 'hasDraftChanges is false');
});

runTest('11. validateMilestoneEntry contract', () => {
  const errors1 = validateMilestoneEntry({ title: '' });
  assert(errors1.includes('title_required'), 'empty title rejected');

  const errors2 = validateMilestoneEntry({ title: (null as unknown) as string, completionMode: 'manual' });
  assert(errors2.includes('title_required'), 'null title rejected');

  const errors3 = validateMilestoneEntry({ title: 'Titulo', completionMode: 'manual' });
  assert(errors3.length === 0, 'valid entry passes');
});

runTest('12. persistido reordered produces changeset', () => {
  const snap = twoMilestoneSnapshot();
  let draft = buildMilestoneEditorDraft(snap);
  draft = moveMilestoneDown(draft, draft.entries[0].localId);
  const changeset = buildMilestoneChangeset(draft);
  assert(changeset !== null, 'changeset generated after reorder');
  const reorderOps = changeset !== null ? changeset.operations.filter((op) => op.operation === 'reorder') : [];
  assert(reorderOps.length > 0, 'contains reorder operations');
});

runTest('13. double submit gate: singleFlight blocks concurrent', () => {
  const gate = createPlanWriteSingleFlightGate();
  assert(gate.acquire('key-1'), 'first acquire succeeds');
  assert(!gate.acquire('key-2'), 'second acquire blocked while in-flight');
  assert(gate.release('key-1'), 'release succeeds');
  assert(gate.acquire('key-2'), 'third acquire succeeds after release');
});

runTest('14. re-open editor loads persisted structure', () => {
  const snap = oneMilestoneSnapshot();
  const draft = buildMilestoneEditorDraft(snap);
  assert(draft.entries.length === 1, 'persisted milestone loaded');
  assert(draft.entries[0].title === 'Hito A', 'persisted title correct');
  assert(draft.entries[0].localId === msId1, 'localId is persisted UUID');
});

runTest('15. add milestone produces changeset with add operation', () => {
  resetLocalIdSeq(0);
  const snap = emptySnapshot();
  const draft = buildMilestoneEditorDraft(snap);
  const withMs = addMilestoneToDraft(draft, { title: 'Nuevo', completionMode: 'automatic' });
  const changeset = buildMilestoneChangeset(withMs);
  assert(changeset !== null, 'changeset exists');
  assert(changeset !== null && changeset.operations[0].operation === 'add', 'operation is add');
  assert(changeset !== null && changeset.operations[0].entityId === null, 'entityId is null for add');
  assert(changeset !== null && changeset.operations[0].payload.title === 'Nuevo', 'payload has title');
});

runTest('16. one milestone projects readiness useful', () => {
  const snap = oneMilestoneSnapshot();
  const readiness = projectActivationReadiness(snap);
  assert(readiness === 'READY' || readiness === 'NO_USEFUL_STRUCTURE', 'readiness returns valid projection');
  assert(readiness === 'READY', 'one milestone should be READY');
});

runTest('17. draftMilestoneCount tracks entries', () => {
  resetLocalIdSeq(0);
  const snap = emptySnapshot();
  let draft = buildMilestoneEditorDraft(snap);
  assert(draftMilestoneCount(draft) === 0, 'count 0 initially');
  draft = addMilestoneToDraft(draft, { title: 'MS1', completionMode: 'manual' });
  assert(draftMilestoneCount(draft) === 1, 'count 1 after add');
  draft = addMilestoneToDraft(draft, { title: 'MS2', completionMode: 'manual' });
  assert(draftMilestoneCount(draft) === 2, 'count 2 after second add');
});

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
if (failCount > 0) process.exit(1);