import { requestJson, OPERATION_KINDS, type RequestJsonOptions } from './api';
import type { PlannerEvent } from './plannerEvents';
import type { PlannerTask } from './plannerTasks';

// ---------------------------------------------------------------------------
// V1 canonical Home Summary (M9) — see services/planner/homeSummaryTypes.ts
// ---------------------------------------------------------------------------

import {
  parsePlannerHomeSummary,
  type PlannerHomeSummaryV1,
  type HomeSummaryParseError,
} from './planner/homeSummaryTypes';

/**
 * Options accepted by the single V1 Home Summary load.
 * No mutation headers. No client-supplied household ID (server-src authority).
 * Accepts AbortSignal + timeout for cancel/lifecycle.
 */
export type GetHomePlannerSummaryOptions = {
  readonly accessToken: string;
  readonly signal?: AbortSignal | null;
  readonly timeoutMs?: number;
  readonly requestId?: string;
};

export type GetHomePlannerSummaryResult =
  | { ok: true; summary: PlannerHomeSummaryV1 }
  | { ok: false; kind: 'parse' | 'transport'; error: HomeSummaryParseError | Error };

/**
 * Single canonical frontend consumer of `GET /api/planner/summary`.
 *
 * Binding rules:
 *   - Calls ONLY `GET /api/planner/summary`. Never Tasks/Events/Goals/Calendar.
 *   - Uses Core `requestJson` (request registry, error envelope, debug).
 *   - Accepts AbortSignal (household switch / unmount) and timeout.
 *   - No mutation headers (read-only).
 *   - Classifies errors: `parse` when payload structure is invalid, `transport`
 *     for network/HTTP envelope failures.
 *   - Does NOT cache internally — cache is owned by the hook via `plannerCache`.
 *   - Does NOT rank, filter, slice, or merge any endpoint.
 */
export async function getHomePlannerSummary(
  options: GetHomePlannerSummaryOptions,
): Promise<GetHomePlannerSummaryResult> {
  const { accessToken, signal, timeoutMs, requestId } = options;
  const headers: Record<string, string> = {};
  if (requestId) headers['X-Request-Id'] = requestId;
  const reqOpts: RequestJsonOptions = {
    accessToken,
    signal,
    timeoutMs,
    headers,
    operationKind: OPERATION_KINDS.READ_ONLY,
  };
  try {
    const raw = await requestJson<unknown>('/api/planner/summary', reqOpts);
    const parseResult = parsePlannerHomeSummary(raw);
    if (!parseResult.ok) {
      return { ok: false, kind: 'parse', error: parseResult.error };
    }
    return { ok: true, summary: parseResult.summary };
  } catch (error) {
    const wrapped = error instanceof Error ? error : new Error(String(error));
    return { ok: false, kind: 'transport', error: wrapped };
  }
}

// ---------------------------------------------------------------------------
// Legacy V0 compatibility wrapper (deprecated; REMOVE_LEGACY marked at M9)
// ---------------------------------------------------------------------------

/**
 * @deprecated Use `getHomePlannerSummary` for V1 Home. Kept for back-compat
 * with V0 consumers (PlannerScreen dashboard) until those consumers migrate.
 * M9 Home must NOT import this wrapper.
 */
export type PlannerSummary = {
  pending_tasks_count: number;
  today_tasks_count: number;
  overdue_tasks_count: number;
  awaiting_verification_count: number;
  upcoming_events_count: number;
  tasks_today: PlannerTask[];
  overdue_tasks: PlannerTask[];
  awaiting_verification_tasks: PlannerTask[];
  upcoming_events: PlannerEvent[];
  briefing_text: string;
};

export const getPlannerSummary = (accessToken: string) =>
  requestJson<PlannerSummary>('/api/planner/summary', { accessToken });
