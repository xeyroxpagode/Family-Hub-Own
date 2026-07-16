/**
 * Planner V1 — M4 Submit Lifecycle Adapter (Task & Event create).
 *
 * Purpose:
 * - Single adapter that bridges mutation intent, service call, error mapping,
 *   cache invalidation, and sheet state lock for Task/Event create operations.
 * - Eliminates duplication between TaskFormHost and EventFormHost.
 * - Does NOT contain domain logic; each call delegates to the existing
 *   service layer.
 *
 * Binding rules:
 * - Submit uses `PlannerMutationIntent` (mutationId + idempotencyKey stable).
 * - `beginSubmit`/`endSubmit` are called on the sheet controller to manage lock.
 * - Retry reuses the same intent (clonePlannerMutationIntent).
 * - Double submit is blocked by the sheet's isSubmitting lock.
 * - Error preserves draft; form stays open.
 * - Success triggers directed cache invalidation and single close.
 * - Abort (household switch, unmount) is silent; no user error displayed.
 * - Idempotency key prevents server duplicates.
 * - No If-Match on create.
 */

import type { PlannerSheetController } from '../../context/PlannerSheetContext';
import {
  createPlannerMutationIntent,
  clonePlannerMutationIntent,
  toRequestJsonOptions,
  type PlannerMutationIntent,
} from './plannerMutationIntent';
export type { PlannerMutationIntent } from './plannerMutationIntent';
import {
  classifyPlannerError,
  isPlannerAbort,
  isRetryable,
  type PlannerError,
} from './plannerErrorAdapter';
import { createPlannerTask, type CreatePlannerTaskPayload } from '../plannerTasks';
import { createPlannerEvent, type CreatePlannerEventPayload } from '../plannerEvents';
import { createGoal, type CreatePlannerGoalInput, type PlannerGoal } from '../plannerGoals';
import { plannerCache } from './plannerCache';
import type { HouseholdScope } from './plannerKeys';
import { ApiError } from '../api';

// ---------------------------------------------------------------------------
// 1. Submit result types
// ---------------------------------------------------------------------------

export type PlannerCreateSubmitResult =
  | { readonly status: 'success' }
  | { readonly status: 'error'; readonly error: PlannerError; readonly retryable: boolean };

export type PlannerCreateState =
  | { readonly kind: 'idle'; readonly intent: PlannerMutationIntent }
  | { readonly kind: 'submitting' }
  | { readonly kind: 'error'; readonly error: PlannerError; readonly intent: PlannerMutationIntent }
  | { readonly kind: 'success' };

// ---------------------------------------------------------------------------
// 2. Task create adapter
// ---------------------------------------------------------------------------

export async function executeTaskCreateSubmit(params: {
  accessToken: string;
  payload: CreatePlannerTaskPayload;
  scope: HouseholdScope;
  sheet: PlannerSheetController;
  intent: PlannerMutationIntent;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<PlannerCreateSubmitResult> {
  const { accessToken, payload, scope, sheet, intent, signal, timeoutMs } = params;

  const intentId = intent.mutationId;

  try {
    sheet.beginSubmit(intentId);

    const response = await createPlannerTask(accessToken, payload, {
      idempotencyKey: intent.idempotencyKey,
    });

    // Success: directed invalidation
    plannerCache.executeInvalidation(
      { kind: 'task', action: 'create' },
      scope,
    );

    return { status: 'success' };
  } catch (err: unknown) {
    // Abort is silent — never show user error
    if (isPlannerAbort(err)) {
      return { status: 'error', error: classifyPlannerError(err), retryable: false };
    }

    const plannerError = classifyPlannerError(err);
    const retryable = isRetryable(plannerError.class);

    // For forbidden (403), optionally invalidate capabilities so the UI
    // re-evaluates visibility.
    if (err instanceof ApiError && err.status === 403) {
      plannerCache.invalidateCapabilities({
        accountId: '', // will be resolved from context
        householdId: scope.householdId,
        membershipId: '',
      });
    }

    return { status: 'error', error: plannerError, retryable };
  } finally {
    sheet.endSubmit(intentId);
  }
}

// ---------------------------------------------------------------------------
// 3. Event create adapter
// ---------------------------------------------------------------------------

export async function executeEventCreateSubmit(params: {
  accessToken: string;
  payload: CreatePlannerEventPayload;
  scope: HouseholdScope;
  sheet: PlannerSheetController;
  intent: PlannerMutationIntent;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<PlannerCreateSubmitResult> {
  const { accessToken, payload, scope, sheet, intent, signal, timeoutMs } = params;

  const intentId = intent.mutationId;

  try {
    sheet.beginSubmit(intentId);

    const response = await createPlannerEvent(accessToken, payload, {
      idempotencyKey: intent.idempotencyKey,
    });

    // Success: directed invalidation
    plannerCache.executeInvalidation(
      { kind: 'event', action: 'create' },
      scope,
    );

    return { status: 'success' };
  } catch (err: unknown) {
    if (isPlannerAbort(err)) {
      return { status: 'error', error: classifyPlannerError(err), retryable: false };
    }

    const plannerError = classifyPlannerError(err);
    const retryable = isRetryable(plannerError.class);

    if (err instanceof ApiError && err.status === 403) {
      plannerCache.invalidateCapabilities({
        accountId: '',
        householdId: scope.householdId,
        membershipId: '',
      });
    }

    return { status: 'error', error: plannerError, retryable };
  } finally {
    sheet.endSubmit(intentId);
  }
}

// ---------------------------------------------------------------------------
// 4. Intent factory for create (stable, reusable)
// ---------------------------------------------------------------------------

export function createTaskIntent(): PlannerMutationIntent {
  return createPlannerMutationIntent({ kind: 'create', entityKind: 'planner.tasks' });
}

export function createEventIntent(): PlannerMutationIntent {
  return createPlannerMutationIntent({ kind: 'create', entityKind: 'planner.events' });
}

export function createGoalIntent(): PlannerMutationIntent {
  return createPlannerMutationIntent({ kind: 'create', entityKind: 'planner.goals' });
}

export function cloneIntent(original: PlannerMutationIntent): PlannerMutationIntent {
  return clonePlannerMutationIntent(original);
}

// ---------------------------------------------------------------------------
// 5. Goal create adapter
// ---------------------------------------------------------------------------

export type GoalCreateSuccess = {
  goalId: string;
  goal: PlannerGoal;
  version?: number;
  mutationId: string;
  idempotencyKey: string;
};

export async function executeGoalCreateSubmit(params: {
  accessToken: string;
  payload: CreatePlannerGoalInput;
  scope: HouseholdScope;
  sheet: PlannerSheetController;
  intent: PlannerMutationIntent;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<PlannerCreateSubmitResult & { success?: GoalCreateSuccess }> {
  const { accessToken, payload, scope, sheet, intent, signal, timeoutMs } = params;

  const intentId = intent.mutationId;

  try {
    sheet.beginSubmit(intentId);

    const { goal } = await createGoal(accessToken, payload, {
      idempotencyKey: intent.idempotencyKey,
      mutationId: intent.mutationId,
    });

    plannerCache.executeInvalidation(
      { kind: 'goal', action: 'create' },
      scope,
    );

    const success: GoalCreateSuccess = {
      goalId: goal.id,
      goal,
      version: goal.version,
      mutationId: intent.mutationId,
      idempotencyKey: intent.idempotencyKey ?? '',
    };

    return { status: 'success', success };
  } catch (err: unknown) {
    if (isPlannerAbort(err)) {
      return { status: 'error', error: classifyPlannerError(err), retryable: false };
    }

    const plannerError = classifyPlannerError(err);
    const retryable = isRetryable(plannerError.class);

    if (err instanceof ApiError && err.status === 403) {
      plannerCache.invalidateCapabilities({
        accountId: '',
        householdId: scope.householdId,
        membershipId: '',
      });
    }

    return { status: 'error', error: plannerError, retryable };
  } finally {
    sheet.endSubmit(intentId);
  }
}

// ---------------------------------------------------------------------------
// 6. Error message resolver for user display
// ---------------------------------------------------------------------------

export function resolveCreateErrorMessage(error: PlannerError): string {
  switch (error.class) {
    case 'validation':
      return error.code
        ? `Error de validación (${error.code})`
        : 'Revisá los datos del formulario.';
    case 'forbidden':
      return 'No tenés permiso para crear este elemento.';
    case 'conflict':
      return error.code === 'idempotency_in_flight'
        ? 'La operación ya está en curso. Esperá un momento.'
        : 'Conflicto. Intentá de nuevo.';
    case 'timeout':
      return 'El servidor tardó en responder. Reintentá.';
    case 'offline':
      return 'Sin conexión. Verificá tu red y reintentá.';
    case 'server':
      return 'Error del servidor. Reintentá en unos segundos.';
    case 'abort':
      // Should never be shown — aborts are silent
      return '';
    case 'not_found':
      return 'Recurso no encontrado.';
    default:
      return 'Error inesperado. Reintentá.';
  }
}

export function resolveCreateErrorRequestId(error: PlannerError): string | null {
  return error.requestId
    ?? (error.original instanceof ApiError ? error.original.requestId : null);
}