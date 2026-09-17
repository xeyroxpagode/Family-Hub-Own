/**
 * Planner V1 — M1 Error Classification & Version Contract Adapter.
 *
 * Purpose:
 * - Typed error classification over the Core `ApiError` envelope.
 * - Retryable / conflict / forbidden / validation / offline / server / abort
 *   categories with access to the sanitized technical object.
 * - Version & concurrency contract: read → conserve version → mutate with
 *   If-Match → success with new version. 412 triggers directed refetch,
 *   never last-write-wins.
 *
 * Binding rules (frozen by `planner_v1_implementation_order.md` §M1):
 * - Planner consumes the global error envelope (`error.code|message|request_id|details`).
 * - Stack traces and raw UUIDs are never shown as primary user messages.
 * - `request_id` may be preserved as secondary/support info only.
 * - 412 conflict is classified, not silently retried.
 * - After success the adapter exposes the canonical new version.
 * - Original `ApiError` object is preserved for safe debugging.
 *
 * Out of scope for M1:
 * - Visual error states (M2/Boundary).
 * - Conflict UI modal (M2/M4/M5).
 */

import { ApiError } from '../api';

// ---------------------------------------------------------------------------
// 1. Error classification
// ---------------------------------------------------------------------------

export type PlannerErrorClass =
  | 'validation'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'idempotency_conflict'
  | 'in_flight'
  | 'timeout'
  | 'abort'
  | 'offline'
  | 'server'
  | 'transient'
  | 'fatal'
  | 'unknown';

export type PlannerSafeErrorCategory =
  | 'validation'
  | 'forbidden'
  | 'not_found'
  | 'version_conflict'
  | 'idempotency_conflict'
  | 'in_flight'
  | 'safe_server_rejection'
  | 'uncertain_network_outcome'
  | 'offline'
  | 'retryable_transient'
  | 'fatal_sanitized';

export type PlannerSafeErrorBehavior = {
  readonly category: PlannerSafeErrorCategory;
  readonly message: string;
  readonly preservesData: boolean;
  readonly allowsRetry: boolean;
  readonly requiresRefetch: boolean;
  readonly opensConflictReview: boolean;
  readonly restoresOptimisticState: boolean;
  readonly keepsOperationPending: boolean;
  readonly canAutoClose: boolean;
};

/**
 * A wrapped error that preserves the original `ApiError` while providing
 * Planner-specific classification, the sanitized code, and the request ID
 * for secondary support display.
 */
export type PlannerError = {
  readonly original: ApiError | Error;
  readonly class: PlannerErrorClass;
  readonly code: string | null;
  readonly requestId: string | null;
  readonly isRetryable: boolean;
};

/**
 * Classify a thrown error captured by Planner transport into a typed
 * `PlannerError`. Abort/timeout are NOT classified as `ApiError` because
 * Core throws `AbortError` from request control.
 */
export function classifyPlannerError(error: unknown): PlannerError {
  if (isPlannerAbort(error)) {
    return {
      original: error as Error,
      class: 'abort',
      code: null,
      requestId: null,
      isRetryable: true,
    };
  }

  if (!(error instanceof ApiError)) {
    const isOffline = error instanceof TypeError
      || (typeof (error as any)?.message === 'string'
        && (error as Error).message.toLowerCase().includes('network'));
    return {
      original: error instanceof Error ? error : new Error(String(error)),
      class: isOffline ? 'offline' : 'unknown',
      code: null,
      requestId: null,
      isRetryable: isOffline,
    };
  }

  const { status, code, requestId } = error;

  if (status === 400 || status === 422) {
    return { original: error, class: 'validation', code, requestId, isRetryable: false };
  }
  if (status === 401) {
    return { original: error, class: 'forbidden', code, requestId, isRetryable: false };
  }
  if (status === 403) {
    return { original: error, class: 'forbidden', code, requestId, isRetryable: false };
  }
  if (status === 404) {
    return { original: error, class: 'not_found', code, requestId, isRetryable: false };
  }
  if (status === 409) {
    if (code === 'idempotency_conflict' || code === 'idempotency_key_conflict') {
      return { original: error, class: 'idempotency_conflict', code, requestId, isRetryable: false };
    }
    if (code === 'idempotency_in_flight') {
      return { original: error, class: 'in_flight', code, requestId, isRetryable: true };
    }
    return { original: error, class: 'conflict', code, requestId, isRetryable: false };
  }
  if (status === 412) {
    return { original: error, class: 'conflict', code, requestId, isRetryable: false };
  }
  if (status === 429) {
    return { original: error, class: 'transient', code, requestId, isRetryable: true };
  }
  if (status >= 500) {
    return { original: error, class: 'transient', code, requestId, isRetryable: true };
  }

  return { original: error, class: 'unknown', code, requestId, isRetryable: false };
}

/**
 * True when the error is an abort (household switch, timeout, unmount),
 * not a functional error. Consumers MUST suppress user-visible error UI.
 */
export function isPlannerAbort(error: unknown): boolean {
  return error instanceof Error && (
    error.name === 'AbortError'
    || (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError')
  );
}

/**
 * True when the error class allows a safe retry with the SAME intent
 * (preserving mutationId and idempotencyKey).
 */
export function isRetryable(classifier: PlannerErrorClass): boolean {
  return classifier === 'server'
    || classifier === 'transient'
    || classifier === 'offline'
    || classifier === 'abort'
    || classifier === 'in_flight';
}

export function toPlannerSafeErrorBehavior(error: PlannerError): PlannerSafeErrorBehavior {
  switch (error.class) {
    case 'validation':
      return safeBehavior('validation', 'Revisá los datos antes de continuar.', {
        restoresOptimisticState: true,
      });
    case 'forbidden':
      return safeBehavior('forbidden', 'No tenés permiso para realizar esta acción.', {
        requiresRefetch: true,
        restoresOptimisticState: true,
      });
    case 'not_found':
      return safeBehavior('not_found', 'Este elemento ya no está disponible.', {
        requiresRefetch: true,
        restoresOptimisticState: true,
      });
    case 'conflict':
      return safeBehavior('version_conflict', 'Los datos cambiaron en otro dispositivo.', {
        requiresRefetch: true,
        opensConflictReview: true,
        restoresOptimisticState: true,
      });
    case 'idempotency_conflict':
      return safeBehavior('idempotency_conflict', 'Esta operación ya se procesó con otros datos.', {
        requiresRefetch: true,
        restoresOptimisticState: true,
      });
    case 'in_flight':
      return safeBehavior('in_flight', 'La operación ya está en curso.', {
        allowsRetry: true,
        keepsOperationPending: true,
      });
    case 'offline':
      return safeBehavior('offline', 'Sin conexión. Conservamos tus datos para reintentar.', {
        allowsRetry: true,
        keepsOperationPending: true,
      });
    case 'abort':
      return safeBehavior('uncertain_network_outcome', 'La respuesta no llegó. Vamos a reconciliar antes de repetir.', {
        allowsRetry: true,
        requiresRefetch: true,
        keepsOperationPending: true,
      });
    case 'timeout':
      return safeBehavior('uncertain_network_outcome', 'La respuesta tardó demasiado. Vamos a verificar el resultado.', {
        allowsRetry: true,
        requiresRefetch: true,
        keepsOperationPending: true,
      });
    case 'server':
      return safeBehavior('safe_server_rejection', 'No pudimos completar la acción. Reintentá en unos segundos.', {
        allowsRetry: true,
        restoresOptimisticState: true,
      });
    case 'transient':
      return safeBehavior('retryable_transient', 'El servidor no respondió a tiempo. Reintentá en unos segundos.', {
        allowsRetry: true,
        keepsOperationPending: true,
      });
    default:
      return safeBehavior('fatal_sanitized', 'No pudimos completar la acción.', {
        restoresOptimisticState: true,
      });
  }
}

function safeBehavior(
  category: PlannerSafeErrorCategory,
  message: string,
  overrides: Partial<Omit<PlannerSafeErrorBehavior, 'category' | 'message'>> = {},
): PlannerSafeErrorBehavior {
  return {
    category,
    message,
    preservesData: true,
    allowsRetry: false,
    requiresRefetch: false,
    opensConflictReview: false,
    restoresOptimisticState: false,
    keepsOperationPending: false,
    canAutoClose: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 2. Version & concurrency adapter
// ---------------------------------------------------------------------------

/**
 * Extract the canonical entity version from a 200/201 success response.
 * Returns `undefined` when the response shape doesn't contain a numeric
 * `version` field (e.g. list endpoints).
 */
export function extractEntityVersion(
  response: unknown,
): number | undefined {
  if (!response || typeof response !== 'object') return undefined;
  const record = response as Record<string, unknown>;
  const version = record.version;
  return typeof version === 'number' && Number.isFinite(version) ? version : undefined;
}

/**
 * Expected version for If-Match derived from a previously fetched entity.
 * Accepts numbers or stringified integers.
 */
export function parseEntityVersionForIfMatch(version: unknown): string | undefined {
  if (typeof version === 'number' && Number.isFinite(version) && version >= 1) {
    return String(version);
  }
  if (typeof version === 'string' && /^[1-9]\d*$/.test(version)) {
    return version;
  }
  return undefined;
}

/**
 * Extract the `current` and `expected` versions from a 412 conflict
 * response details, when present. Used for directed refetch (not LWW).
 */
export function extractConflictVersions(
  plannerError: PlannerError,
): { current: number | null; expected: number | null } {
  const details = (plannerError.original as ApiError).details;
  if (!details || typeof details !== 'object') return { current: null, expected: null };
  const d = details as Record<string, unknown>;
  const current = typeof d.current === 'number' ? d.current : null;
  const expected = typeof d.expected === 'number' ? d.expected : null;
  return { current, expected };
}

/**
 * Assert that a Planner error is a version conflict (412). Returns `true`
 * when the error carries `version_conflict_v2` as its code.
 */
export function isVersionConflict(plannerError: PlannerError): boolean {
  return plannerError.class === 'conflict' && plannerError.code === 'version_conflict_v2';
}

// ---------------------------------------------------------------------------
// 3. Safe request ID extraction (secondary / support display)
// ---------------------------------------------------------------------------

/**
 * Extract the request ID from a classified error (safe for support display,
 * NOT the primary user-facing message).
 */
export function getPlannerErrorRequestId(plannerError: PlannerError): string | null {
  return plannerError.requestId
    ?? (plannerError.original instanceof ApiError ? plannerError.original.requestId : null);
}
