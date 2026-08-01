import { OPERATION_KINDS } from '../front/mi-front-limpio/services/api';
import type { PlannerMutationIntent } from '../front/mi-front-limpio/services/planner/plannerMutationIntent';
import {
  PLANNER_RELIABILITY_CANONICAL_VISUAL_STATES,
  describePlannerVisualState,
  isHighAttentionPlannerVisualState,
  type PlannerVisualStateKind,
} from '../front/mi-front-limpio/services/planner/plannerVisualStates';
import {
  createPlannerFormState,
  reducePlannerFormState,
} from '../front/mi-front-limpio/services/planner/plannerFormState';
import type { PlannerSafeErrorBehavior, PlannerSafeErrorCategory } from '../front/mi-front-limpio/services/planner/plannerErrorAdapter';
import {
  PLANNER_RELIABILITY_DOMAIN_VISUAL_ADAPTERS,
  PLANNER_RELIABILITY_INTEGRATION_REQUESTS,
  adaptPlannerFormReliabilityState,
  createPlannerReliabilityConflictContent,
  createPlannerReliabilityVisualSummary,
  describePlannerDraftReliabilityState,
  describePlannerPresetReliabilityState,
  describePlannerRealtimeReliabilityVisual,
  describePlannerRestartVisualState,
  hasTechnicalLeakageInPlannerReliabilityCopy,
  mapPlannerDurableOperationToVisualKind,
} from '../front/mi-front-limpio/services/planner/reliability/frontendExperience';
import {
  PlannerReliabilityRealtimeBridge,
  createPlannerOperationRecord,
  createPlannerPendingOperation,
  transitionPlannerOperation,
  type PlannerDurableOperationState,
  type PlannerOperationPartition,
  type PlannerOperationRecord,
} from '../front/mi-front-limpio/services/planner/reliability';

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

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

function assertEqual<T>(actual: T, expected: T, message: string): void {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${message} expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
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

function partition(): PlannerOperationPartition {
  return { authenticatedUserId: 'user-a', activeHouseholdId: 'hh-a' };
}

function intent(seed: string): PlannerMutationIntent {
  return {
    mutationId: `mut-${seed}`,
    idempotencyKey: `idem-${seed}`,
    operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
  };
}

function record(seed: string, state: PlannerDurableOperationState = 'pending'): PlannerOperationRecord {
  const descriptor = createPlannerPendingOperation({
    intent: intent(seed),
    domain: 'task',
    operationType: 'update',
    partition: partition(),
    scope: { kind: 'household', householdId: 'hh-a' },
    entity: { type: 'task', id: seed },
    payload: { title: 'private title is never rendered by reliability copy' },
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
  });
  const pending = createPlannerOperationRecord(descriptor);
  if (state === 'pending') return pending;
  if (state === 'in_flight') return transitionPlannerOperation(pending, 'in_flight', new Date('2026-08-01T00:00:01.000Z'));
  if (state === 'retrying' || state === 'uncertain' || state === 'conflicted' || state === 'confirmed') {
    const inFlight = transitionPlannerOperation(pending, 'in_flight', new Date('2026-08-01T00:00:01.000Z'));
    return {
      ...transitionPlannerOperation(inFlight, state, new Date('2026-08-01T00:00:02.000Z')),
      conflict: state === 'conflicted' ? { kind: 'version_conflict', stableCode: 'version_conflict', currentVersion: 2 } : undefined,
      authoritativeResult: state === 'confirmed' ? { outcome: 'updated', version: 2 } : undefined,
    };
  }
  return pending;
}

function safeError(category: PlannerSafeErrorCategory): PlannerSafeErrorBehavior {
  return {
    category,
    message: 'No pudimos completar la acción.',
    preservesData: true,
    allowsRetry: true,
    requiresRefetch: category === 'version_conflict',
    opensConflictReview: category === 'version_conflict',
    restoresOptimisticState: false,
    keepsOperationPending: category === 'offline' || category === 'uncertain_network_outcome',
    canAutoClose: false,
  };
}

runTest('canonical visual model covers every Reliability frontend state', () => {
  assertEqual(
    PLANNER_RELIABILITY_CANONICAL_VISUAL_STATES,
    ['idle', 'pending', 'in_flight', 'syncing', 'retrying', 'uncertain', 'conflicted', 'confirmed', 'offline', 'safe_error', 'blocked_by_dependency', 'quarantined'],
    'canonical state list',
  );
  for (const state of PLANNER_RELIABILITY_CANONICAL_VISUAL_STATES) {
    const descriptor = describePlannerVisualState(state);
    assert(descriptor.kind === state, `${state} descriptor kind`);
    assert(descriptor.title.length > 0 && descriptor.message.length > 0, `${state} has safe copy`);
    assert(descriptor.accessibilityLabel.includes(descriptor.title), `${state} accessibility label`);
    assert(descriptor.reduceMotion !== undefined, `${state} reduce motion policy`);
    assert(descriptor.disappearsWhen !== undefined, `${state} disappearance policy`);
  }
});

runTest('local attention hierarchy is explicit and non-global', () => {
  assert(isHighAttentionPlannerVisualState('conflicted'), 'conflicted high attention');
  assert(isHighAttentionPlannerVisualState('uncertain'), 'persistent uncertain high attention');
  assert(isHighAttentionPlannerVisualState('quarantined'), 'quarantined high attention');
  assert(describePlannerVisualState('retrying').attention === 'medium', 'retrying medium attention');
  assert(describePlannerVisualState('offline').attention === 'medium', 'offline pending medium attention');
  assert(describePlannerVisualState('pending').attention === 'low', 'pending low attention');
  assert(describePlannerVisualState('confirmed').attention === 'low', 'confirmed low attention');
});

runTest('copy is safe and does not leak technical identifiers', () => {
  const forbiddenTerms = ['mutation ID', 'idempotency key', 'request hash', 'UUID', 'SQLSTATE', 'stack', 'RPC'];
  for (const state of PLANNER_RELIABILITY_CANONICAL_VISUAL_STATES) {
    const descriptor = describePlannerVisualState(state);
    assert(!hasTechnicalLeakageInPlannerReliabilityCopy(`${descriptor.title} ${descriptor.message} ${descriptor.accessibilityLabel}`), `${state} no technical leakage`);
    for (const term of forbiddenTerms) {
      assert(!descriptor.message.toLowerCase().includes(term.toLowerCase()), `${state} omits ${term}`);
    }
  }
});

runTest('durable operation states map to visual states including restart semantics', () => {
  assert(mapPlannerDurableOperationToVisualKind('pending') === 'pending', 'pending maps to pending');
  assert(mapPlannerDurableOperationToVisualKind('in_flight') === 'in_flight', 'in flight maps while live');
  assert(mapPlannerDurableOperationToVisualKind('in_flight', { restoredAfterRestart: true }) === 'uncertain', 'in flight restored maps uncertain');
  assert(mapPlannerDurableOperationToVisualKind('retrying') === 'retrying', 'retrying maps');
  assert(mapPlannerDurableOperationToVisualKind('conflicted') === 'conflicted', 'conflicted maps');
  assert(mapPlannerDurableOperationToVisualKind('pending', { offline: true }) === 'offline', 'offline pending maps');
  assert(mapPlannerDurableOperationToVisualKind('pending', { dependencyBlocked: true }) === 'blocked_by_dependency', 'dependency block maps');
  assert(describePlannerRestartVisualState('pending').message === 'Pendiente de sincronización.', 'restart pending copy');
  assert(describePlannerRestartVisualState('in_flight').message === 'No pudimos confirmar si se guardó.', 'restart in flight copy');
  assert(describePlannerRestartVisualState('retrying').message === 'Se volverá a intentar.', 'restart retrying copy');
  assert(describePlannerRestartVisualState('conflicted').message === 'Revisá los cambios antes de continuar.', 'restart conflict copy');
  assert(describePlannerRestartVisualState('confirmed').message === 'Guardado.', 'restart confirmed copy');
});

runTest('operation summary emits typed integration intents without exposing internals in copy', () => {
  const summary = createPlannerReliabilityVisualSummary({
    operation: record('a', 'uncertain'),
    domain: 'task',
    entityLabel: 'Tarea',
    surface: 'row',
    restoredAfterRestart: true,
  });
  assert(summary.visualKind === 'uncertain', 'summary visual kind');
  assert(summary.primaryIntent?.type === 'review_operation', 'primary review intent');
  assert(summary.secondaryIntent?.type === 'retry_operation', 'secondary retry intent');
  assert(summary.preservedContent, 'content preserved');
  assert(summary.blocksNewActions, 'uncertain blocks duplicate/new actions locally');
  assert(!hasTechnicalLeakageInPlannerReliabilityCopy(summary.safeOperationSummary), 'summary copy safe');
});

runTest('conflict content preserves local and remote versions with authorized actions only', () => {
  const conflicted = record('conflict', 'conflicted');
  const content = createPlannerReliabilityConflictContent({
    operation: conflicted,
    domain: 'task',
    entityLabel: 'Tarea',
    conflict: conflicted.conflict,
    retryAuthorized: true,
    discardLocalAuthorized: false,
    refetchPending: true,
  });
  assert(content.localContentPreserved, 'local content preserved');
  assert(content.reviewIntent.type === 'request_conflict_route', 'review route intent');
  assert(content.retryIntent?.type === 'retry_operation', 'retry intent authorized');
  assert(content.discardIntent === null, 'discard blocked when not authorized');
  assert(content.refetchPending, 'refetch pending represented');
  assert(!hasTechnicalLeakageInPlannerReliabilityCopy(`${content.localVersionLabel} ${content.remoteVersionLabel} ${content.safeMessage}`), 'conflict copy safe');
});

runTest('form and PlannerSheetHost adapters block double submit and preserve content', () => {
  const initial = createPlannerFormState({ title: 'Comprar leche' });
  const submit = reducePlannerFormState(initial, { type: 'SUBMIT', identity: { mutationId: 'mut-submit', idempotencyKey: 'idem-submit' } });
  const duplicate = reducePlannerFormState(submit, { type: 'SUBMIT', identity: { mutationId: 'mut-2', idempotencyKey: 'idem-2' } });
  assertEqual(duplicate.identity, submit.identity, 'double submit keeps first identity');
  const submitting = adaptPlannerFormReliabilityState(submit);
  assert(submitting.sheetState === 'submitting', 'submitting sheet state');
  assert(submitting.blocksDoubleSubmit, 'submitting blocks double submit');
  assert(!submitting.canCloseAutomatically, 'submitting does not auto close');

  const uncertain = reducePlannerFormState(submit, { type: 'ERROR', error: safeError('uncertain_network_outcome') });
  const uncertainAdapter = adaptPlannerFormReliabilityState(uncertain);
  assert(uncertainAdapter.sheetState === 'uncertain', 'uncertain sheet state');
  assert(uncertainAdapter.preservesContent, 'uncertain preserves form content');
  assert(uncertainAdapter.retryKeepsIdentity, 'retry keeps identity');
  assert(uncertain.value.title === 'Comprar leche', 'form value preserved');

  const conflict = reducePlannerFormState(submit, { type: 'ERROR', error: safeError('version_conflict') });
  const conflictAdapter = adaptPlannerFormReliabilityState(conflict);
  assert(conflictAdapter.sheetState === 'conflict', 'conflict sheet state');
  assert(conflictAdapter.manualCloseWarning !== null, 'manual close warns for conflict');
  assert(!conflictAdapter.canCloseAutomatically, 'conflict does not auto close');

  const success = reducePlannerFormState(submit, { type: 'SUCCESS' });
  assert(adaptPlannerFormReliabilityState(success, { successPolicyAllowsClose: true }).successCanClose, 'success can close when policy allows');
});

runTest('Task, Event, Plan, Preset and Draft adapters publish surfaces and do not own productive wiring', () => {
  assert(PLANNER_RELIABILITY_DOMAIN_VISUAL_ADAPTERS.task.surfaces.includes('fulfillment'), 'task fulfillment surface');
  assert(PLANNER_RELIABILITY_DOMAIN_VISUAL_ADAPTERS.task.surfaces.includes('trash_restore'), 'task trash restore surface');
  assert(PLANNER_RELIABILITY_DOMAIN_VISUAL_ADAPTERS.event.surfaces.includes('agenda_row'), 'event agenda row');
  assert(PLANNER_RELIABILITY_DOMAIN_VISUAL_ADAPTERS.event.surfaces.includes('recurrence'), 'event recurrence');
  assert(PLANNER_RELIABILITY_DOMAIN_VISUAL_ADAPTERS.event.surfaces.includes('rsvp'), 'event rsvp');
  assert(PLANNER_RELIABILITY_DOMAIN_VISUAL_ADAPTERS.event.surfaces.includes('attendance'), 'event attendance');
  assert(PLANNER_RELIABILITY_DOMAIN_VISUAL_ADAPTERS.plan.surfaces.includes('structure_changeset'), 'plan structure changeset');
  assert(PLANNER_RELIABILITY_DOMAIN_VISUAL_ADAPTERS.plan.surfaces.includes('links'), 'plan task/event links');
  assert(PLANNER_RELIABILITY_DOMAIN_VISUAL_ADAPTERS.preset.surfaces.includes('publish_revision'), 'preset publish revision');
  assert(PLANNER_RELIABILITY_DOMAIN_VISUAL_ADAPTERS.preset.surfaces.includes('apply'), 'preset apply surface');
  assert(PLANNER_RELIABILITY_DOMAIN_VISUAL_ADAPTERS.draft.surfaces.includes('autosave'), 'draft autosave surface');
  assert(PLANNER_RELIABILITY_DOMAIN_VISUAL_ADAPTERS.draft.surfaces.includes('recovery'), 'draft recovery surface');
  for (const adapter of Object.values(PLANNER_RELIABILITY_DOMAIN_VISUAL_ADAPTERS)) {
    assert(adapter.ownsProductiveMutation === false, `${adapter.domain} does not own productive mutation`);
    assert(adapter.connectsScheduler === false, `${adapter.domain} does not connect scheduler`);
    assert(adapter.connectsRealtime === false, `${adapter.domain} does not connect realtime`);
    assert(adapter.emitsIntegrationIntents.includes('request_conflict_route'), `${adapter.domain} publishes conflict intent`);
  }
});

runTest('Draft and Preset visual states cover autosave, recovery and duplicate apply', () => {
  assert(describePlannerDraftReliabilityState('autosaving').kind === 'autosave', 'draft autosaving');
  assert(describePlannerDraftReliabilityState('saved').kind === 'confirmed', 'draft saved');
  assert(describePlannerDraftReliabilityState('offline_pending').kind === 'offline', 'draft offline pending');
  assert(describePlannerDraftReliabilityState('uncertain').kind === 'uncertain', 'draft uncertain');
  assert(describePlannerDraftReliabilityState('conflict').kind === 'conflicted', 'draft conflict');
  assert(describePlannerDraftReliabilityState('recovered_after_restart').message.includes('recuperamos') || describePlannerDraftReliabilityState('recovered_after_restart').message.includes('Recuperamos'), 'draft recovery copy');
  assert(describePlannerDraftReliabilityState('resume').primaryAction === 'review', 'draft resume asks review');
  assert(describePlannerPresetReliabilityState({ operation: 'apply', duplicateApplyDetected: true }).message === 'Este preset ya fue aplicado.', 'preset apply no duplication copy');
  assert(describePlannerPresetReliabilityState({ operation: 'trash_restore', durableState: 'retrying' }).kind === 'retrying', 'preset trash restore retrying');
});

runTest('realtime requests reconciliation but never confirms visually', () => {
  const bridge = new PlannerReliabilityRealtimeBridge();
  const op = record('rt', 'uncertain');
  const signal = { domain: 'task', entityType: 'task', entityId: 'rt', scope: { kind: 'household' as const, householdId: 'hh-a' }, version: 2, signalId: 'sig-1' };
  const decision = bridge.receiveSignal({ signal, operations: [op], adapters: [] });
  assert(decision.action === 'reconciliation_requested', 'realtime requests reconciliation');
  const descriptor = describePlannerRealtimeReliabilityVisual(decision);
  assert(descriptor.kind === 'syncing', 'realtime maps to syncing');
  assert(descriptor.message !== 'Guardado.', 'realtime does not show saved');
  assert(op.state === 'uncertain', 'realtime does not mutate operation to confirmed');
});

runTest('Integration Requests are explicit and scoped', () => {
  assert(PLANNER_RELIABILITY_INTEGRATION_REQUESTS.length >= 4, 'integration requests published');
  assert(PLANNER_RELIABILITY_INTEGRATION_REQUESTS.some((request) => request.id.includes('connect-domain-mutations')), 'mutation enqueue request');
  assert(PLANNER_RELIABILITY_INTEGRATION_REQUESTS.some((request) => request.id.includes('scheduler')), 'scheduler reconnect lifecycle request');
  assert(PLANNER_RELIABILITY_INTEGRATION_REQUESTS.some((request) => request.id.includes('realtime')), 'realtime reconciliation request');
  assert(PLANNER_RELIABILITY_INTEGRATION_REQUESTS.some((request) => request.id.includes('conflict')), 'conflict review routing request');
  assert(PLANNER_RELIABILITY_INTEGRATION_REQUESTS.every((request) => request.limits.includes('No') || request.limits.includes('no')), 'limits are declared');
});

console.log(`\nM11.7B Reliability Frontend tests: ${passCount} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
