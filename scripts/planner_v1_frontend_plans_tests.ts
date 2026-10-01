import { readFileSync } from 'node:fs';

import {
  buildMinimalPlanCreateWrite,
  buildPlanLifecycleWrite,
  buildPlanStructureChangesetWrite,
  getPlanMotionContract,
  getPlanResponsiveContract,
  hasMeaningfulPlanCreateContent,
  planCreateAdapter,
  planLifecycleMutationReducers,
  planStructureEditAdapter,
  plansDetailRoute,
  plansLaneAdapters,
  plansRootScreenAdapter,
  planSummaryProjection,
  projectPlanDetail,
  projectPlanRootSections,
  projectPlanSummary,
  shouldPersistPlanDraft,
  type MinimalPlanCreatePayload,
  type PlanSummaryProjection,
} from '../front/mi-front-limpio/services/planner/plannerPlans';
import type {
  PlannerPlan,
  PlannerPlanGraphDto,
} from '../front/mi-front-limpio/types/PlannerPlan';
import { ROUTE_NAMES } from '../front/mi-front-limpio/navigation/plannerNavigationContract';
import { describePlannerVisualState } from '../front/mi-front-limpio/services/planner/plannerVisualStates';
import { createPlannerFormState, reducePlannerFormState } from '../front/mi-front-limpio/services/planner/plannerFormState';
import { toPlannerSafeErrorBehavior, classifyPlannerError } from '../front/mi-front-limpio/services/planner/plannerErrorAdapter';
import { ApiError } from '../front/mi-front-limpio/services/api';

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

const planId = '11111111-1111-4111-8111-111111111111';
const taskId = '22222222-2222-4222-8222-222222222222';
const eventId = '33333333-3333-4333-8333-333333333333';

const basePlan: PlannerPlan = {
  id: planId,
  version: 4,
  scope: 'household',
  ownerPersonId: null,
  householdId: 'house-1',
  objective: 'Preparar mudanza',
  description: null,
  lifecycle: 'active',
  targetDate: '2026-08-15',
  finalizationKind: 'event',
  archivedAt: null,
  trashedAt: null,
  createdAt: '2026-07-22T00:00:00Z',
  updatedAt: '2026-07-23T00:00:00Z',
  availableActions: ['pause', 'complete', 'close', 'trash'],
};

const graph: PlannerPlanGraphDto = {
  plan: basePlan,
  indicators: {
    milestoneCount: 2,
    completedMilestoneCount: 1,
    measurementCount: 2,
    reachedMeasurementCount: 0,
    necessaryRequirementCount: 4,
    satisfiedNecessaryRequirementCount: 1,
    supportingRequirementCount: 1,
  },
  milestones: [
    {
      id: '44444444-4444-4444-8444-444444444444',
      planId,
      version: 2,
      title: 'Contratar transporte',
      description: null,
      completionMode: 'manual',
      lifecycle: 'pending',
      classification: 'necessary',
      sortOrder: 0,
    },
    {
      id: '55555555-5555-4555-8555-555555555555',
      planId,
      version: 1,
      title: 'Empacar biblioteca',
      description: null,
      completionMode: 'automatic',
      lifecycle: 'completed',
      classification: 'supporting',
      sortOrder: 1,
    },
  ],
  measurements: [
    {
      id: '66666666-6666-4666-8666-666666666666',
      planId,
      version: 1,
      name: 'Presupuesto',
      currentValue: 420000,
      targetValue: 800000,
      unit: 'ARS',
      targetOperator: 'gte',
      targetReached: false,
      classification: 'necessary',
      sortOrder: 0,
      history: [],
    },
    {
      id: '77777777-7777-4777-8777-777777777777',
      planId,
      version: 1,
      name: 'Cajas',
      currentValue: 72,
      targetValue: 100,
      unit: 'cajas',
      targetOperator: 'gte',
      targetReached: false,
      classification: 'supporting',
      sortOrder: 1,
      history: [],
    },
  ],
  manualConditions: [
    {
      id: '88888888-8888-4888-8888-888888888888',
      planId,
      version: 1,
      label: 'Confirmar llaves',
      isSatisfied: false,
      classification: 'necessary',
      sortOrder: 2,
    },
  ],
  requirements: [
    {
      id: '99999999-9999-4999-8999-999999999999',
      planId,
      parentRequirementId: null,
      version: 1,
      classification: 'necessary',
      sortOrder: 0,
      subject: { kind: 'milestone', milestoneId: '44444444-4444-4444-8444-444444444444' },
      satisfied: false,
    },
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      planId,
      parentRequirementId: null,
      version: 1,
      classification: 'necessary',
      sortOrder: 1,
      subject: { kind: 'measurement', measurementId: '66666666-6666-4666-8666-666666666666' },
      satisfied: false,
    },
    {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      planId,
      parentRequirementId: null,
      version: 1,
      classification: 'necessary',
      sortOrder: 2,
      subject: { kind: 'manual_condition', manualConditionId: '88888888-8888-4888-8888-888888888888' },
      satisfied: false,
    },
    {
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      planId,
      parentRequirementId: null,
      version: 1,
      classification: 'necessary',
      sortOrder: 3,
      subject: {
        kind: 'external',
        externalKind: 'event',
        externalReferenceKey: eventId,
        externalEntityId: eventId,
        bindingState: 'bound',
        linkedEntity: {
          entityType: 'event',
          externalEntityId: eventId,
          planRequirementId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          title: 'Mudanza',
          lifecycle: 'scheduled',
          relationKind: 'necessary',
          availability: 'available',
        },
      },
      satisfied: false,
    },
    {
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      planId,
      parentRequirementId: '99999999-9999-4999-8999-999999999999',
      version: 1,
      classification: 'supporting',
      sortOrder: 4,
      subject: {
        kind: 'external',
        externalKind: 'task',
        externalReferenceKey: taskId,
        externalEntityId: taskId,
        bindingState: 'bound',
        linkedEntity: {
          entityType: 'task',
          externalEntityId: taskId,
          planRequirementId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          title: 'Comprar cajas',
          lifecycle: 'pending',
          relationKind: 'supporting',
          availability: 'available',
        },
      },
      satisfied: false,
    },
  ],
  draftIsolation: {
    contained: true,
    operationalChildrenPublished: false,
    appearsInHome: false,
    notifies: false,
    recurs: false,
  },
};

runTest('published adapters match Foundation contracts', () => {
  assert(plansRootScreenAdapter.key === 'plans', 'root adapter uses plans slot');
  assert(plansRootScreenAdapter.developmentState === 'available', 'root adapter available');
  assert(plansLaneAdapters.root === plansRootScreenAdapter, 'lane exports root adapter');
  assert(plansLaneAdapters.planSummaryProjection === planSummaryProjection, 'lane exports projection');
  assert(plansLaneAdapters.detailRoute.routeName === ROUTE_NAMES.PlanDetail, 'detail route uses canonical alias');
  assert(plansDetailRoute.parseParams({ entityId: planId }).entityId === planId, 'detail params parse entityId');
  assert(plansLaneAdapters.createAdapter.mode === 'create', 'create adapter mode');
  assert(plansLaneAdapters.structureEditAdapter.mode === 'edit', 'structure adapter mode');
});

runTest('Plan summary projection exposes real data and no aggregate score', () => {
  const summary = projectPlanSummary(graph);
  assert(summary.id === planId, 'plan id');
  assert(summary.objective === 'Preparar mudanza', 'objective');
  assert(summary.scope === 'household', 'household scope');
  assert(summary.lifecycle === 'active', 'lifecycle');
  assert(!summary.archived && !summary.trashed && !summary.draft, 'flags');
  assert(summary.version === 4, 'version');
  assert(summary.currentBlocker?.kind === 'final_event_pending', 'blocker from necessary final Event');
  assert(summary.nextCommitment?.kind === 'event', 'next commitment from linked event boundary');
  assert(summary.currentMilestone?.title === 'Contratar transporte', 'current milestone');
  assert(Boolean(summary.primaryMeasurement?.label.includes('Presupuesto')), 'primary Measurement');
  assert(summary.availableActions.some((action) => action.key === 'edit_structure'), 'structure access action');
  assert(summary.detailNavigationIntent.entityId === planId, 'detail navigation intent');
  assert(summary.indicators.some((item) => item.label === '1 de 2 hitos completados'), 'milestone indicator');
  assert(summary.indicators.some((item) => item.label.includes('420000 de 800000 ARS')), 'Measurement indicator');
  assert(!JSON.stringify(summary).toLowerCase().includes('percentage'), 'summary has no universal percentage property');
});

runTest('root sections exclude archived and trash, keep drafts last', () => {
  const summaries: PlanSummaryProjection[] = [
    projectPlanSummary({ ...basePlan, id: '11111111-1111-4111-8111-111111111112', lifecycle: 'draft', availableActions: ['activate', 'trash'] }),
    projectPlanSummary({ ...basePlan, id: '11111111-1111-4111-8111-111111111113', lifecycle: 'paused', availableActions: ['resume', 'trash'] }),
    projectPlanSummary({ ...basePlan, id: '11111111-1111-4111-8111-111111111114', lifecycle: 'completed', availableActions: ['archive', 'reopen', 'trash'] }),
    projectPlanSummary({ ...basePlan, id: '11111111-1111-4111-8111-111111111115', archivedAt: '2026-07-24T00:00:00Z' }),
    projectPlanSummary({ ...basePlan, id: '11111111-1111-4111-8111-111111111116', trashedAt: '2026-07-24T00:00:00Z', lifecycle: 'trash' }),
    projectPlanSummary(basePlan),
  ];
  const sections = projectPlanRootSections(summaries);
  assertEqual(sections.map((section) => section.key), ['active', 'paused', 'terminal', 'drafts'], 'section order');
  assert(!JSON.stringify(sections).includes('11111111-1111-4111-8111-111111111115'), 'archive excluded');
  assert(!JSON.stringify(sections).includes('11111111-1111-4111-8111-111111111116'), 'trash excluded');
  assert(sections.at(-1)?.key === 'drafts', 'drafts last');
});

runTest('detail is detail-first and prioritizes blocker before full structure', () => {
  const detail = projectPlanDetail(graph);
  assertEqual(detail.priority.map((item) => item.key), [
    'blocker',
    'next_commitment',
    'current_milestone',
    'actions',
    'primary_measurement',
    'structure_access',
  ], 'priority order');
  assert(detail.layout.phone === 'full_screen', 'phone full screen');
  assert(detail.layout.tablet === 'master_detail_available', 'tablet master detail contract');
  assert(detail.measurements.length === 2, 'multiple Measurements accessible');
  assert(detail.linkedNavigationIntents.length === 2, 'bound linked Task/Event expose honest navigation');
  assert(detail.linkedNavigationIntents.some((intent) => intent.entityType === 'task' && intent.params.entityId === taskId), 'Task link navigates to Task Detail params');
  assert(detail.linkedNavigationIntents.some((intent) => intent.entityType === 'event' && intent.params.entityId === eventId), 'Event link navigates to Event Detail params');
  assert(detail.summary.availableActions.find((action) => action.key === 'edit_structure')?.primary === false, 'edit is secondary');
});

runTest('minimal create and Draft rules preserve mutation identity', () => {
  const empty: MinimalPlanCreatePayload = {
    objective: '',
    scope: 'personal',
    outcome: 'save_draft',
  };
  assert(!hasMeaningfulPlanCreateContent(empty), 'empty form has no meaningful content');
  assert(!shouldPersistPlanDraft(empty), 'empty form does not create Draft');
  assert(planCreateAdapter.validate(empty).includes('empty_draft_not_persisted'), 'empty Draft validation');

  const payload: MinimalPlanCreatePayload = {
    objective: 'Organizar viaje',
    scope: 'household',
    householdId: 'house-1',
    finalizationKind: 'event',
    outcome: 'save_draft',
  };
  assert(planCreateAdapter.validate(payload).length === 0, 'valid create payload');
  assert(shouldPersistPlanDraft(payload), 'meaningful Draft persists');
  const request = buildMinimalPlanCreateWrite(payload);
  assert(request.entityType === 'plan' && request.action === 'create', 'create uses Plan graph create');
  assert((request.payload as Record<string, unknown>).desired_outcome === 'save_draft', 'explicit outcome');

  const identity = planCreateAdapter.createIdentity();
  let state = createPlannerFormState(payload);
  state = reducePlannerFormState(state, { type: 'SUBMIT', identity });
  const error = toPlannerSafeErrorBehavior(classifyPlannerError(new Error('AbortError')));
  state = reducePlannerFormState(state, { type: 'ERROR', error });
  state = reducePlannerFormState(state, { type: 'RETRY' });
  assert(state.identity?.mutationId === identity.mutationId, 'retry keeps mutation id');
  assert(state.value.objective === 'Organizar viaje', 'uncertain preserves form content');
});

runTest('structure editor validates whole changeset and avoids multi-request orchestration', () => {
  const draft = {
    planId,
    expectedPlanVersion: 4,
    nodes: [
      {
        localId: 'n1',
        entityType: 'milestone' as const,
        action: 'create' as const,
        classification: 'necessary' as const,
        payload: { title: 'Reservar camion', completion_mode: 'manual' },
      },
      {
        localId: 'n2',
        entityType: 'manual_condition' as const,
        action: 'set' as const,
        entityId: '88888888-8888-4888-8888-888888888888',
        expectedVersion: 1,
        classification: 'necessary' as const,
        payload: { is_satisfied: true },
      },
    ],
  };
  assert(planStructureEditAdapter.validate(draft).length === 0, 'valid structure draft');
  const decision = buildPlanStructureChangesetWrite(draft);
  assert(decision.kind === 'remote_changeset', 'structure save uses real Integration endpoint');
  assert(decision.remoteRequest.planId === planId, 'remote request targets Plan');
  assert(decision.draft.nodes.length === 2, 'operations remain locally contained');
  assert(decision.draft.expectedPlanVersion === 4, 'expected Plan version preserved');
  assert(decision.integrationRequest === 'PROPOSED IR-FE-PLAN-STRUCTURE-001', 'P1 Integration Request named');
});

runTest('lifecycle writes cover active pause resume complete close reopen archive trash restore', () => {
  for (const transition of ['activate', 'pause', 'resume', 'complete', 'close', 'reopen', 'archive', 'unarchive', 'trash', 'restore'] as const) {
    const write = buildPlanLifecycleWrite(basePlan, transition, { closedReason: 'manual' });
    assert(write.entityType === 'plan' && write.action === 'transition', `${transition} uses transition`);
    assert((write.payload as Record<string, unknown>).transition === transition, `${transition} payload`);
    assert(write.expectedVersion === basePlan.version, `${transition} If-Match source`);
  }
  const reconciled = planLifecycleMutationReducers.reconcile([projectPlanSummary(basePlan)], {
    data: { ...basePlan, lifecycle: 'paused', version: 5 },
    outcome: 'updated',
    version: 5,
    operationId: 'op-1',
    mutationId: 'mut-1',
    idempotencyKey: 'idem-1',
    replayed: false,
    noop: false,
  });
  assert(reconciled[0].lifecycle === 'paused', 'lifecycle reducer reconciles confirmed state');
});

runTest('Archive and Trash projections remain distinct', () => {
  const archived = { ...basePlan, id: '11111111-1111-4111-8111-111111111117', lifecycle: 'completed' as const, archivedAt: '2026-07-24T00:00:00Z', availableActions: ['unarchive', 'reopen', 'trash'] };
  const trashed = { ...basePlan, id: '11111111-1111-4111-8111-111111111118', lifecycle: 'trash' as const, trashedAt: '2026-07-24T00:00:00Z', availableActions: ['restore'] };
  assert(planSummaryProjection.projectArchive([archived, trashed]).length === 1, 'archive excludes trash');
  assert(planSummaryProjection.projectTrash([archived, trashed]).length === 1, 'trash excludes archive-only');
  assert(planSummaryProjection.projectArchive([archived])[0].availableActions.some((action) => action.key === 'unarchive'), 'archive exposes Unarchive');
  assert(planSummaryProjection.projectTrash([trashed])[0].availableActions.some((action) => action.key === 'restore'), 'trash exposes Restore');
});

runTest('mutation and visual states are safely represented', () => {
  assert(projectPlanSummary(graph, { pending: true }).syncVisualState.kind === 'pending_sync', 'pending sync state');
  assert(projectPlanSummary(graph, { uncertain: true }).syncVisualState.uncertain, 'uncertain state');
  assert(projectPlanSummary(graph, { conflict: true }).currentBlocker?.kind === 'conflict', 'conflict blocker');
  for (const state of ['loading', 'stale', 'offline', 'partial_error', 'fatal_error', 'retrying', 'conflict'] as const) {
    assert(typeof describePlannerVisualState(state).message === 'string', `${state} descriptor exists`);
  }
  const conflict = toPlannerSafeErrorBehavior(classifyPlannerError(new ApiError('conflict', 412, 'version_conflict_v2')));
  assert(conflict.opensConflictReview && conflict.restoresOptimisticState, 'safe conflict behavior');
});

runTest('accessibility, Reduce Motion and responsive contracts are explicit', () => {
  assert(getPlanResponsiveContract(390).phone === 'full_screen', 'phone contract');
  assert(getPlanResponsiveContract(900).tablet === 'master_detail_available', 'tablet contract');
  const motion = getPlanMotionContract(true);
  assert(!motion.rollback.allowTranslate && !motion.rowPress.allowScale, 'reduced motion removes transforms');
  assert(planSummaryProjection.project(graph).indicators.every((item) => item.label.length > 0), 'indicators have text labels');
  assert(planSummaryProjection.project(graph).availableActions.every((action) => action.label.length > 0), 'actions have visible labels');
});

runTest('visible terminology is Planes and internal compatibility can remain physical', () => {
  const copy = planSummaryProjection.project(graph);
  const visible = JSON.stringify({
    objective: copy.objective,
    indicators: copy.indicators,
    actions: copy.availableActions,
  });
  assert(!/\bGoal(s)?\b/.test(visible), 'no visible Goal terminology');
  assert(!/\bMeta(s)?\b/.test(visible), 'no visible Meta terminology');
  assert(planSummaryProjection.project(graph).detailNavigationIntent.entityId === planId, 'Plan detail route consumes legacy physical alias through Foundation');
});

runTest('new Plans files do not introduce universal percentage text', () => {
  for (const file of [
    'front/mi-front-limpio/services/planner/plannerPlans.ts',
    'front/mi-front-limpio/screens/planner/PlannerPlansSurfaces.tsx',
  ]) {
    const text = readFileSync(file, 'utf8');
    assert(!/(progressPercentage|overallProgress|completionRate|progress_percentage|universal percentage)/i.test(text), `${file} has no aggregate percentage`);
  }
});

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
if (failCount > 0) process.exit(1);
