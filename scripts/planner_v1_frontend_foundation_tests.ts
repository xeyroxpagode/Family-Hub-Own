import { ApiError, OPERATION_KINDS } from '../front/mi-front-limpio/services/api';
import {
  buildPlannerVersionedIntent,
  normalizePlannerMutationResult,
  plannerMutationRequestOptions,
  plannerReadRequestOptions,
  requiresPlannerIdempotency,
} from '../front/mi-front-limpio/services/planner/plannerTransportContracts';
import {
  classifyPlannerError,
  toPlannerSafeErrorBehavior,
} from '../front/mi-front-limpio/services/planner/plannerErrorAdapter';
import {
  applyPlannerOptimistic,
  markPlannerConflict,
  preserveUncertainPlannerOptimistic,
  reconcilePlannerOptimistic,
  rollbackPlannerOptimistic,
  type PlannerOptimisticOperation,
} from '../front/mi-front-limpio/services/planner/plannerOptimisticState';
import {
  createPlannerFormState,
  reducePlannerFormState,
} from '../front/mi-front-limpio/services/planner/plannerFormState';
import {
  calendarBadgeForCount,
  combinePlannerCalendarProjections,
  countPlannerCalendarDay,
  groupPlannerCalendarByDay,
  semanticLocalDateFromProjection,
  type PlannerCalendarProjection,
} from '../front/mi-front-limpio/services/planner/plannerCalendarProjection';
import { describePlannerVisualState } from '../front/mi-front-limpio/services/planner/plannerVisualStates';
import { getPlannerMotionSpec } from '../front/mi-front-limpio/services/planner/plannerMotion';
import { plannerKeys, householdOf } from '../front/mi-front-limpio/services/planner/plannerKeys';
import { normalizePlannerTabKey, PLANNER_TAB_KEYS } from '../front/mi-front-limpio/navigation/plannerNavigationContract';

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ok ${message}`);
    passCount++;
  } else {
    console.error(`  fail ${message}`);
    failCount++;
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
    console.error(`  threw ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }
}

const uuidTask = '11111111-1111-4111-8111-111111111111';
const uuidEvent = '22222222-2222-4222-8222-222222222222';

runTest('tabs are Tasks Events Plans with legacy normalization', () => {
  assertEqual(PLANNER_TAB_KEYS, ['tasks', 'events', 'plans'] as const, 'canonical tabs');
  assertEqual(normalizePlannerTabKey('calendar'), 'events', 'legacy calendar');
  assertEqual(normalizePlannerTabKey('goals'), 'plans', 'legacy goals');
  assertEqual(normalizePlannerTabKey('events'), 'events', 'events accepted');
});

runTest('transport read and mutation options preserve one identity', () => {
  const read = plannerReadRequestOptions({ accessToken: 'token', contextScope: 'household-a' });
  assert(read.operationKind === OPERATION_KINDS.READ_ONLY, 'read only');
  assert(read.contextScope === 'household-a', 'read context scope');

  const intent = buildPlannerVersionedIntent('task', 5);
  const options = plannerMutationRequestOptions({
    accessToken: 'token',
    intent,
    expectedVersion: 5,
    payload: { title: 'x' },
  });

  assert(options.mutationId === intent.mutationId, 'mutation id preserved');
  assert(options.idempotencyKey === intent.idempotencyKey, 'idempotency key preserved');
  assert(options.expectedVersion === 5, 'If-Match version mapped');
  assert(options.operationKind === OPERATION_KINDS.VERSIONED_MUTATION, 'versioned operation kind');
  assert(requiresPlannerIdempotency(options.operationKind), 'idempotency required');
});

runTest('mutation result recognizes success replay and noop', () => {
  const replay = normalizePlannerMutationResult<{ id: string }>({
    data: { id: uuidTask },
    outcome: 'replay',
    version: 7,
    operationId: 'op-1',
  }, { mutationId: 'mut-1', idempotencyKey: 'idem-1' });
  assert(replay.replayed && !replay.noop, 'replay outcome');
  assert(replay.version === 7, 'result version');
  assert(replay.mutationId === 'mut-1', 'fallback mutation id');

  const noop = normalizePlannerMutationResult<{ id: string }>({ data: { id: uuidTask }, outcome: 'noop' });
  assert(noop.noop && !noop.replayed, 'noop outcome');
});

runTest('error mapping covers backend real envelopes', () => {
  const conflict = toPlannerSafeErrorBehavior(classifyPlannerError(
    new ApiError('conflict', 412, 'version_conflict_v2', undefined, 'req-1', { current: 2, expected: 1 }),
  ));
  assert(conflict.category === 'version_conflict', 'version conflict category');
  assert(conflict.requiresRefetch && conflict.opensConflictReview, 'conflict requires review');
  assert(conflict.restoresOptimisticState, 'conflict rolls back optimistic state');

  const idem = toPlannerSafeErrorBehavior(classifyPlannerError(new ApiError('idem', 409, 'idempotency_conflict')));
  assert(idem.category === 'idempotency_conflict', 'idempotency conflict category');
  assert(idem.requiresRefetch, 'idempotency conflict refetch');

  const inFlight = toPlannerSafeErrorBehavior(classifyPlannerError(new ApiError('busy', 409, 'idempotency_in_flight')));
  assert(inFlight.category === 'in_flight', 'in flight category');
  assert(inFlight.keepsOperationPending && inFlight.allowsRetry, 'in flight keeps pending');

  const offline = toPlannerSafeErrorBehavior(classifyPlannerError(new TypeError('Failed to fetch')));
  assert(offline.category === 'offline', 'offline category');
  assert(offline.preservesData, 'offline preserves data');
});

runTest('optimistic success replay noop rollback and duplicate tap', () => {
  const busy = new Map<string, PlannerOptimisticOperation<number>>();
  const identity = { mutationId: 'mut-1', idempotencyKey: 'idem-1' };
  const applied = applyPlannerOptimistic({
    current: 1,
    identity,
    entityKey: uuidTask,
    contextToken: 1,
    busy,
    apply: (value) => value + 1,
  });
  assert(applied.type === 'applied', 'optimistic applied');
  if (applied.type !== 'applied') return;
  busy.set(uuidTask, applied.operation);

  const duplicate = applyPlannerOptimistic({
    current: 2,
    identity,
    entityKey: uuidTask,
    contextToken: 1,
    busy,
    apply: (value) => value + 1,
  });
  assert(duplicate.type === 'duplicate', 'duplicate tap blocked');

  assert(reconcilePlannerOptimistic({ current: 2, operation: applied.operation, contextToken: 1, outcome: 'updated', confirmed: 3 }).state === 3, 'success confirmed');
  assert(reconcilePlannerOptimistic({ current: 2, operation: applied.operation, contextToken: 1, outcome: 'replay', confirmed: 3 }).status === 'confirmed', 'replay confirmed');
  assert(reconcilePlannerOptimistic({ current: 2, operation: applied.operation, contextToken: 1, outcome: 'noop', confirmed: 1 }).state === 1, 'noop reconciled');
  assert(rollbackPlannerOptimistic(applied.operation).state === 1, 'rollback previous');
  assert(preserveUncertainPlannerOptimistic(applied.operation).status === 'uncertain', 'uncertain preserved');
  assert(markPlannerConflict(applied.operation).status === 'conflicted', 'conflict marked');
  assert(reconcilePlannerOptimistic({ current: 2, operation: applied.operation, contextToken: 2, outcome: 'updated' }).status === 'conflicted', 'stale household response ignored');
});

runTest('form state blocks duplicate submit and retries with same identity', () => {
  const identity = { mutationId: 'mut-1', idempotencyKey: 'idem-1' };
  let state = createPlannerFormState({ title: '' });
  state = reducePlannerFormState(state, { type: 'EDIT', value: { title: 'A' } });
  state = reducePlannerFormState(state, { type: 'SUBMIT', identity });
  const duplicate = reducePlannerFormState(state, { type: 'SUBMIT', identity: { mutationId: 'mut-2', idempotencyKey: 'idem-2' } });
  assert(duplicate.identity?.mutationId === 'mut-1', 'duplicate submit blocked');

  const abortError = new Error('aborted');
  abortError.name = 'AbortError';
  const uncertain = toPlannerSafeErrorBehavior(classifyPlannerError(abortError));
  state = reducePlannerFormState(state, { type: 'ERROR', error: uncertain });
  assert(state.status === 'uncertain', 'uncertain state');
  state = reducePlannerFormState(state, { type: 'RETRY' });
  assert(state.identity?.mutationId === 'mut-1', 'retry keeps identity');
  state = reducePlannerFormState(state, { type: 'SUCCESS' });
  assert(state.status === 'success' && state.terminal, 'success terminal');
});

runTest('calendar projection count badge sorting dedupe timezone all-day date-only', () => {
  const projections: PlannerCalendarProjection[] = [
    {
      entityType: 'task',
      entityId: uuidTask,
      semanticDate: '2026-07-29',
      timed: false,
      allDay: true,
      title: 'Task',
      lifecycle: 'active',
      destination: { route: 'TaskDetail', params: { entityId: uuidTask } },
    },
    {
      entityType: 'event',
      entityId: uuidEvent,
      projectionId: 'occ-1',
      semanticDate: '2026-07-29',
      timed: true,
      allDay: false,
      start: '2026-07-29T10:00:00-03:00',
      end: '2026-07-29T11:00:00-03:00',
      timezone: 'America/Argentina/Buenos_Aires',
      title: 'Event',
      lifecycle: 'scheduled',
      destination: { route: 'EventDetail', params: { entityId: uuidEvent } },
    },
    {
      entityType: 'event',
      entityId: uuidEvent,
      projectionId: 'occ-1',
      semanticDate: '2026-07-29',
      timed: true,
      allDay: false,
      start: '2026-07-29T10:00:00-03:00',
      title: 'Duplicate',
      lifecycle: 'scheduled',
      destination: { route: 'EventDetail', params: { entityId: uuidEvent } },
    },
  ];
  assert(calendarBadgeForCount(0) === '', '0 hidden');
  assert(calendarBadgeForCount(1) === '1', '1 badge');
  assert(calendarBadgeForCount(9) === '9', '9 badge');
  assert(calendarBadgeForCount(10) === '9+', '9 plus badge');
  assert(combinePlannerCalendarProjections(projections).length === 2, 'dedupe duplicate projection');
  assert(countPlannerCalendarDay(projections, '2026-07-29') === 2, 'task and event same day count');
  assert(groupPlannerCalendarByDay(projections)[0].badge === '2', 'day badge combines types');
  assert(semanticLocalDateFromProjection({ dateOnly: '2026-07-29' }) === '2026-07-29', 'date-only preserved');
  assert(semanticLocalDateFromProjection({ allDayDate: '2026-07-30' }) === '2026-07-30', 'all-day preserved');
  assert(semanticLocalDateFromProjection({ instant: '2026-07-31T02:00:00Z', timezone: 'UTC' }) === '2026-07-31', 'timed instant date');
});

runTest('query keys separate household personal and plans compatibility', () => {
  const household = { householdId: 'house-a' };
  assertEqual(plannerKeys.plans.detail(household, uuidTask), ['planner', 'plans', 'house-a', 'detail', uuidTask], 'plan detail key');
  assert(householdOf(plannerKeys.presets({ personId: 'person-a' })) === null, 'personal presets no household');
  assert(householdOf(plannerKeys.presets(household)) === 'house-a', 'household presets scoped');
});

runTest('visual primitives and reduced motion', () => {
  assert(describePlannerVisualState('refresh_visible').preservesContent, 'refresh keeps content');
  assert(describePlannerVisualState('fatal_error').role === 'alert', 'fatal alert');
  assert(describePlannerVisualState('conflict').liveRegion === 'assertive', 'conflict announced');

  const normal = getPlannerMotionSpec('sheet_transition', false);
  const reduced = getPlannerMotionSpec('sheet_transition', true);
  assert(normal.allowTranslate, 'normal sheet may translate');
  assert(!reduced.allowScale && !reduced.allowTranslate && !reduced.allowCollapse, 'reduced removes transforms');
  assert(reduced.durationMs <= 80, 'reduced short duration');
});

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
if (failCount > 0) process.exit(1);
