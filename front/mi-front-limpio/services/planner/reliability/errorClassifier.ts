import { AbortError, ApiError } from '../../api';
import type { PlannerNormalizedConflict, PlannerNormalizedOperationError } from './types';

function retryAfterToMs(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value * 1000);
  if (typeof value === 'string') {
    const seconds = Number(value);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const dateMs = Date.parse(value);
    if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
  }
  return undefined;
}

export function classifyPlannerOperationError(error: unknown): PlannerNormalizedOperationError {
  if (error instanceof AbortError || (error instanceof Error && error.name === 'AbortError')) {
    return { category: 'timeout_ambiguous', stableCode: 'request_aborted_uncertain' };
  }
  if (error instanceof ApiError) {
    if (error.status === 0) return { category: 'network_retryable', stableCode: error.code ?? 'network_unavailable', requestId: error.requestId, status: error.status, details: error.details };
    if (error.status === 408) return { category: 'timeout_ambiguous', stableCode: error.code ?? 'request_timeout', requestId: error.requestId, status: error.status, details: error.details };
    if (error.status === 429) return { category: 'rate_limited', stableCode: error.code ?? 'rate_limited', requestId: error.requestId, status: error.status, retryAfterMs: retryAfterToMs((error.details as Record<string, unknown> | null)?.retry_after), details: error.details };
    if (error.status === 412 || error.code === 'version_conflict_v2' || error.code === 'version_conflict') return { category: 'version_conflict', stableCode: error.code ?? 'version_conflict', requestId: error.requestId, status: error.status, details: error.details };
    if (error.status === 409 || error.code === 'idempotency_conflict') return { category: 'idempotency_conflict', stableCode: error.code ?? 'idempotency_conflict', requestId: error.requestId, status: error.status, details: error.details };
    if (error.status === 401 || error.status === 403) return { category: 'authorization', stableCode: error.code ?? 'authorization_blocked', requestId: error.requestId, status: error.status, details: error.details };
    if (error.status === 404) return { category: 'not_found', stableCode: error.code ?? 'not_found', requestId: error.requestId, status: error.status, details: error.details };
    if (error.status === 400 || error.status === 422) return { category: 'validation', stableCode: error.code ?? 'validation_failed', requestId: error.requestId, status: error.status, details: error.details };
    if (error.status >= 500 && error.status < 600) return { category: 'server_retryable', stableCode: error.code ?? 'server_retryable', requestId: error.requestId, status: error.status, details: error.details };
    return { category: 'unknown_non_retryable', stableCode: error.code ?? 'unknown_api_error', requestId: error.requestId, status: error.status, details: error.details };
  }
  if (error instanceof TypeError) {
    return { category: 'network_retryable', stableCode: 'network_type_error' };
  }
  return { category: 'unknown_retryable', stableCode: 'unknown_transport_error' };
}

export function conflictFromPlannerOperationError(
  error: PlannerNormalizedOperationError,
): PlannerNormalizedConflict {
  if (error.category === 'version_conflict') {
    const details = error.details as Record<string, unknown> | null;
    return {
      kind: 'version_conflict',
      stableCode: error.stableCode,
      expectedVersion: typeof details?.expected_version === 'number' ? details.expected_version : undefined,
      currentVersion: typeof details?.current_version === 'number' ? details.current_version : undefined,
      authoritativeState: details?.current ?? details?.server_state,
      metadata: { requestId: error.requestId ?? null },
    };
  }
  if (error.category === 'idempotency_conflict') {
    return { kind: 'idempotency_conflict', stableCode: error.stableCode, metadata: { requestId: error.requestId ?? null } };
  }
  if (error.category === 'authorization') {
    return { kind: 'authorization_blocked', stableCode: error.stableCode, metadata: { requestId: error.requestId ?? null } };
  }
  if (error.category === 'validation') {
    return { kind: 'validation_failed', stableCode: error.stableCode, metadata: { requestId: error.requestId ?? null } };
  }
  return { kind: 'unknown_non_retryable', stableCode: error.stableCode, metadata: { requestId: error.requestId ?? null } };
}
