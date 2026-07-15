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
  | 'timeout'
  | 'abort'
  | 'offline'
  | 'server'
  | 'unknown';

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
    return { original: error, class: 'conflict', code, requestId, isRetryable: false };
  }
  if (status === 412) {
    return { original: error, class: 'conflict', code, requestId, isRetryable: false };
  }
  if (status === 429) {
    return { original: error, class: 'server', code, requestId, isRetryable: true };
  }
  if (status >= 500) {
    return { original: error, class: 'server', code, requestId, isRetryable: true };
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
  return classifier === 'server' || classifier === 'offline' || classifier === 'abort';
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