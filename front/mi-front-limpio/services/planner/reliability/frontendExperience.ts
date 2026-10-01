import type { PlannerFormState, PlannerFormStatus } from '../plannerFormState';
import {
  describePlannerVisualState,
  type PlannerLocalAttentionLevel,
  type PlannerVisualActionKind,
  type PlannerVisualStateDescriptor,
  type PlannerVisualStateKind,
} from '../plannerVisualStates';
import type { PlannerRealtimeBridgeDecision } from './realtimeBridge';
import type {
  PlannerDurableOperationState,
  PlannerNormalizedConflict,
  PlannerOperationRecord,
} from './types';

export type PlannerReliabilityFrontendDomain = 'task' | 'event' | 'plan' | 'preset' | 'draft';

export type PlannerReliabilitySurface =
  | 'row'
  | 'agenda_row'
  | 'detail'
  | 'form'
  | 'root'
  | 'structure_changeset'
  | 'lifecycle'
  | 'links'
  | 'trash_restore'
  | 'archive'
  | 'fulfillment'
  | 'recurrence'
  | 'rsvp'
  | 'attendance'
  | 'cancel_reactivate'
  | 'create_edit'
  | 'publish_revision'
  | 'apply'
  | 'autosave'
  | 'recovery';

export type PlannerReliabilityIntegrationIntent =
  | { readonly type: 'retry_operation'; readonly localOperationId: string }
  | { readonly type: 'review_operation'; readonly localOperationId: string; readonly domain: PlannerReliabilityFrontendDomain }
  | { readonly type: 'dismiss_operation_visual'; readonly localOperationId: string }
  | { readonly type: 'discard_local_unsent'; readonly localOperationId: string }
  | { readonly type: 'request_refetch'; readonly domain: PlannerReliabilityFrontendDomain; readonly entityId?: string }
  | { readonly type: 'request_conflict_route'; readonly localOperationId: string; readonly domain: PlannerReliabilityFrontendDomain };

export type PlannerReliabilityVisualSummary = {
  readonly domain: PlannerReliabilityFrontendDomain;
  readonly entityLabel: string;
  readonly surface: PlannerReliabilitySurface;
  readonly visualKind: PlannerVisualStateKind;
  readonly descriptor: PlannerVisualStateDescriptor;
  readonly attention: PlannerLocalAttentionLevel;
  readonly preservedContent: boolean;
  readonly blocksNewActions: boolean;
  readonly primaryIntent: PlannerReliabilityIntegrationIntent | null;
  readonly secondaryIntent: PlannerReliabilityIntegrationIntent | null;
  readonly safeOperationSummary: string;
  readonly restoredAfterRestart: boolean;
};

export type PlannerReliabilityConflictContent = {
  readonly entityLabel: string;
  readonly localVersionLabel: string;
  readonly remoteVersionLabel: string;
  readonly localContentPreserved: boolean;
  readonly refetchPending: boolean;
  readonly reviewIntent: PlannerReliabilityIntegrationIntent;
  readonly retryIntent: PlannerReliabilityIntegrationIntent | null;
  readonly discardIntent: PlannerReliabilityIntegrationIntent | null;
  readonly safeMessage: string;
};

export type PlannerReliabilitySheetState =
  | 'idle'
  | 'submitting'
  | 'offline_pending'
  | 'uncertain'
  | 'conflict'
  | 'retrying'
  | 'success_terminal'
  | 'safe_error';

export type PlannerReliabilitySheetAdapter = {
  readonly sheetState: PlannerReliabilitySheetState;
  readonly visualKind: PlannerVisualStateKind;
  readonly descriptor: PlannerVisualStateDescriptor;
  readonly blocksDoubleSubmit: boolean;
  readonly preservesContent: boolean;
  readonly canCloseAutomatically: boolean;
  readonly manualCloseWarning: string | null;
  readonly retryKeepsIdentity: boolean;
  readonly successCanClose: boolean;
};

export type PlannerReliabilityDraftVisualState =
  | 'autosaving'
  | 'saved'
  | 'offline_pending'
  | 'uncertain'
  | 'conflict'
  | 'recovered_after_restart'
  | 'discarded'
  | 'restored'
  | 'resume';

export type PlannerReliabilityDomainVisualAdapter = {
  readonly domain: PlannerReliabilityFrontendDomain;
  readonly surfaces: readonly PlannerReliabilitySurface[];
  readonly emitsIntegrationIntents: readonly PlannerReliabilityIntegrationIntent['type'][];
  readonly ownsProductiveMutation: false;
  readonly connectsScheduler: false;
  readonly connectsRealtime: false;
};

export const PLANNER_RELIABILITY_DOMAIN_VISUAL_ADAPTERS: Readonly<Record<
  PlannerReliabilityFrontendDomain,
  PlannerReliabilityDomainVisualAdapter
>> = {
  task: adapterContract('task', [
    'row',
    'detail',
    'form',
    'cancel_reactivate',
    'fulfillment',
    'trash_restore',
  ]),
  event: adapterContract('event', [
    'row',
    'agenda_row',
    'detail',
    'form',
    'recurrence',
    'rsvp',
    'attendance',
    'cancel_reactivate',
    'trash_restore',
  ]),
  plan: adapterContract('plan', [
    'root',
    'detail',
    'form',
    'structure_changeset',
    'lifecycle',
    'links',
    'trash_restore',
    'archive',
  ]),
  preset: adapterContract('preset', [
    'create_edit',
    'publish_revision',
    'trash_restore',
    'apply',
  ]),
  draft: adapterContract('draft', [
    'autosave',
    'recovery',
    'form',
    'trash_restore',
  ]),
};

export const PLANNER_RELIABILITY_INTEGRATION_REQUESTS = [
  {
    id: 'connect-domain-mutations-to-reliability-enqueue',
    contract: 'Productive Task/Event/Plan/Preset/Draft mutation services should enqueue PlannerOperationRecord with the published adapter contracts.',
    expectedIntegrationOwnedFiles: ['services/plannerTasks.ts', 'services/plannerEvents*.ts', 'services/planner/plannerPlans.ts', 'services/plannerPresets.ts', 'services/plannerDrafts.ts'],
    testsAvailable: ['planner-reliability-frontend', 'planner-reliability'],
    limits: 'No scheduler, backend, Supabase, package, or global UI changes in this lane.',
  },
  {
    id: 'scheduler-reconnect-session-lifecycle',
    contract: 'Integration owns draining on reconnect, session/logout cleanup, and household switch orchestration over the existing Foundation queue.',
    expectedIntegrationOwnedFiles: ['services/core/lifecycle.ts', 'context/AuthContext.tsx', 'context/HouseholdContext.tsx'],
    testsAvailable: ['planner-reliability', 'planner-reliability-frontend'],
    limits: 'Frontend visual adapters only expose safe states and do not start a productive scheduler.',
  },
  {
    id: 'realtime-reconciliation-binding',
    contract: 'Realtime may request reconciliation/refetch but must not mark operations confirmed without backend-authoritative evidence.',
    expectedIntegrationOwnedFiles: ['services/planner/reliability/realtimeBridge.ts', 'services/planner/plannerCache.ts'],
    testsAvailable: ['planner-reliability', 'planner-reliability-frontend'],
    limits: 'No productive channels are connected here.',
  },
  {
    id: 'conflict-review-routing',
    contract: 'Navigation should route Review intents to a Conflict Review surface and feed it safe local/remote summaries.',
    expectedIntegrationOwnedFiles: ['navigation/*', 'components/planner/*Conflict*'],
    testsAvailable: ['planner-reliability-frontend'],
    limits: 'No automatic field merge and no global route registration from Reliability Frontend.',
  },
] as const;

export function mapPlannerDurableOperationToVisualKind(
  state: PlannerDurableOperationState,
  options: { readonly restoredAfterRestart?: boolean; readonly offline?: boolean; readonly dependencyBlocked?: boolean } = {},
): PlannerVisualStateKind {
  if (options.dependencyBlocked) return 'blocked_by_dependency';
  if (options.offline && (state === 'pending' || state === 'retrying')) return 'offline';
  if (options.restoredAfterRestart && state === 'pending') return 'pending';
  if (options.restoredAfterRestart && state === 'in_flight') return 'uncertain';
  return state;
}

export function describePlannerRestartVisualState(state: PlannerDurableOperationState): PlannerVisualStateDescriptor {
  switch (state) {
    case 'pending':
      return describePlannerVisualState('pending');
    case 'in_flight':
    case 'uncertain':
      return describePlannerVisualState('uncertain');
    case 'retrying':
      return describePlannerVisualState('retrying');
    case 'conflicted':
      return describePlannerVisualState('conflicted');
    case 'confirmed':
      return describePlannerVisualState('confirmed');
    default:
      return describePlannerVisualState('idle');
  }
}

export function createPlannerReliabilityVisualSummary(input: {
  readonly operation: PlannerOperationRecord;
  readonly domain: PlannerReliabilityFrontendDomain;
  readonly entityLabel: string;
  readonly surface: PlannerReliabilitySurface;
  readonly restoredAfterRestart?: boolean;
  readonly offline?: boolean;
  readonly dependencyBlocked?: boolean;
}): PlannerReliabilityVisualSummary {
  const visualKind = mapPlannerDurableOperationToVisualKind(input.operation.state, input);
  const descriptor = input.restoredAfterRestart
    ? describePlannerRestartVisualState(input.operation.state)
    : describePlannerVisualState(visualKind);
  const localOperationId = input.operation.descriptor.localOperationId;

  return {
    domain: input.domain,
    entityLabel: input.entityLabel,
    surface: input.surface,
    visualKind: descriptor.kind,
    descriptor,
    attention: descriptor.attention,
    preservedContent: descriptor.preservesContent,
    blocksNewActions: descriptor.blocksNewActions,
    primaryIntent: intentForAction(descriptor.primaryAction, localOperationId, input.domain),
    secondaryIntent: intentForAction(descriptor.secondaryAction, localOperationId, input.domain),
    safeOperationSummary: `${input.entityLabel}: ${descriptor.message}`,
    restoredAfterRestart: input.restoredAfterRestart === true,
  };
}

export function createPlannerReliabilityConflictContent(input: {
  readonly operation: PlannerOperationRecord;
  readonly domain: PlannerReliabilityFrontendDomain;
  readonly entityLabel: string;
  readonly conflict?: PlannerNormalizedConflict | null;
  readonly retryAuthorized?: boolean;
  readonly discardLocalAuthorized?: boolean;
  readonly refetchPending?: boolean;
}): PlannerReliabilityConflictContent {
  const localOperationId = input.operation.descriptor.localOperationId;
  const localVersion = input.operation.descriptor.expectedVersion;
  const currentVersion = input.conflict?.currentVersion;

  return {
    entityLabel: input.entityLabel,
    localVersionLabel: localVersion === undefined ? 'Cambio local preservado' : `Cambio local sobre versión ${localVersion}`,
    remoteVersionLabel: currentVersion === undefined ? 'Versión remota disponible' : `Versión remota ${currentVersion}`,
    localContentPreserved: true,
    refetchPending: input.refetchPending === true,
    reviewIntent: { type: 'request_conflict_route', localOperationId, domain: input.domain },
    retryIntent: input.retryAuthorized === true ? { type: 'retry_operation', localOperationId } : null,
    discardIntent: input.discardLocalAuthorized === true ? { type: 'discard_local_unsent', localOperationId } : null,
    safeMessage: describePlannerVisualState('conflicted').message,
  };
}

export function adaptPlannerFormReliabilityState<TValue>(
  form: PlannerFormState<TValue>,
  options: { readonly retrying?: boolean; readonly offline?: boolean; readonly successPolicyAllowsClose?: boolean } = {},
): PlannerReliabilitySheetAdapter {
  const sheetState = sheetStateFromFormStatus(form.status, options);
  const visualKind = visualKindFromSheetState(sheetState);
  const descriptor = describePlannerVisualState(visualKind);
  const hasUnconfirmedWork = ['submitting', 'offline_pending', 'uncertain', 'conflict', 'retrying'].includes(sheetState);

  return {
    sheetState,
    visualKind,
    descriptor,
    blocksDoubleSubmit: sheetState === 'submitting' || sheetState === 'retrying' || sheetState === 'offline_pending' || sheetState === 'uncertain' || sheetState === 'conflict',
    preservesContent: descriptor.preservesContent,
    canCloseAutomatically: sheetState === 'success_terminal' && options.successPolicyAllowsClose === true,
    manualCloseWarning: hasUnconfirmedWork ? 'Hay cambios sin confirmar. Si cerrás, vas a poder revisarlos después.' : null,
    retryKeepsIdentity: form.identity !== null && (sheetState === 'uncertain' || sheetState === 'offline_pending' || sheetState === 'safe_error' || sheetState === 'retrying'),
    successCanClose: sheetState === 'success_terminal' && options.successPolicyAllowsClose === true,
  };
}

export function describePlannerDraftReliabilityState(
  state: PlannerReliabilityDraftVisualState,
  options: { readonly restoredAfterRestart?: boolean } = {},
): PlannerVisualStateDescriptor {
  if (options.restoredAfterRestart || state === 'recovered_after_restart' || state === 'resume') {
    return {
      ...describePlannerVisualState('pending'),
      title: 'Borrador recuperado',
      message: 'Recuperamos un borrador después de reiniciar.',
      disappearsWhen: 'manual_review',
      primaryAction: 'review',
    };
  }
  switch (state) {
    case 'autosaving':
      return describePlannerVisualState('autosave');
    case 'saved':
    case 'restored':
      return describePlannerVisualState('confirmed');
    case 'offline_pending':
      return describePlannerVisualState('offline');
    case 'uncertain':
      return describePlannerVisualState('uncertain');
    case 'conflict':
      return describePlannerVisualState('conflicted');
    case 'discarded':
      return describePlannerVisualState('idle');
    default:
      return describePlannerVisualState('idle');
  }
}

export function describePlannerPresetReliabilityState(input: {
  readonly operation: 'create_edit' | 'publish_revision' | 'trash_restore' | 'apply';
  readonly duplicateApplyDetected?: boolean;
  readonly durableState?: PlannerDurableOperationState;
}): PlannerVisualStateDescriptor {
  if (input.duplicateApplyDetected) {
    return {
      ...describePlannerVisualState('confirmed'),
      message: 'Este preset ya fue aplicado.',
      primaryAction: 'none',
    };
  }
  return describePlannerVisualState(input.durableState ?? 'idle');
}

export function describePlannerRealtimeReliabilityVisual(
  decision: PlannerRealtimeBridgeDecision,
): PlannerVisualStateDescriptor {
  if (decision.action === 'reconciliation_requested') {
    return {
      ...describePlannerVisualState('syncing'),
      message: 'Actualización disponible. Vamos a revisar los cambios.',
      disappearsWhen: 'reconciliation_finishes',
    };
  }
  return {
    ...describePlannerVisualState('idle'),
    message: 'Actividad detectada.',
    disappearsWhen: 'immediate',
  };
}

export function hasTechnicalLeakageInPlannerReliabilityCopy(value: string): boolean {
  return /\b(mutation|idempotency|request hash|uuid|sqlstate|rpc|stack|localOperationId|requestId)\b/i.test(value)
    || /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(value);
}

function adapterContract(
  domain: PlannerReliabilityFrontendDomain,
  surfaces: readonly PlannerReliabilitySurface[],
): PlannerReliabilityDomainVisualAdapter {
  return {
    domain,
    surfaces,
    emitsIntegrationIntents: [
      'retry_operation',
      'review_operation',
      'dismiss_operation_visual',
      'discard_local_unsent',
      'request_refetch',
      'request_conflict_route',
    ],
    ownsProductiveMutation: false,
    connectsScheduler: false,
    connectsRealtime: false,
  };
}

function intentForAction(
  action: PlannerVisualActionKind,
  localOperationId: string,
  domain: PlannerReliabilityFrontendDomain,
): PlannerReliabilityIntegrationIntent | null {
  switch (action) {
    case 'retry':
      return { type: 'retry_operation', localOperationId };
    case 'review':
      return { type: 'review_operation', localOperationId, domain };
    case 'dismiss':
      return { type: 'dismiss_operation_visual', localOperationId };
    case 'refetch':
      return { type: 'request_refetch', domain };
    default:
      return null;
  }
}

function sheetStateFromFormStatus(
  status: PlannerFormStatus,
  options: { readonly retrying?: boolean; readonly offline?: boolean },
): PlannerReliabilitySheetState {
  if (options.retrying) return 'retrying';
  if (options.offline && status === 'submitting') return 'offline_pending';
  switch (status) {
    case 'submitting':
    case 'validating':
      return 'submitting';
    case 'offline_pending':
      return 'offline_pending';
    case 'uncertain':
      return 'uncertain';
    case 'conflict':
      return 'conflict';
    case 'success':
      return 'success_terminal';
    case 'safe_error':
      return 'safe_error';
    default:
      return 'idle';
  }
}

function visualKindFromSheetState(state: PlannerReliabilitySheetState): PlannerVisualStateKind {
  switch (state) {
    case 'submitting':
      return 'in_flight';
    case 'offline_pending':
      return 'offline';
    case 'uncertain':
      return 'uncertain';
    case 'conflict':
      return 'conflicted';
    case 'retrying':
      return 'retrying';
    case 'success_terminal':
      return 'confirmed';
    case 'safe_error':
      return 'safe_error';
    default:
      return 'idle';
  }
}
