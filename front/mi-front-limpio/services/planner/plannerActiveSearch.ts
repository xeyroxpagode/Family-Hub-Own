import { AbortError, OPERATION_KINDS, requestJson } from '../api';
import {
  classifyPlannerSearchErrorLike,
  normalizePlannerSearchInput,
  type PlannerSearchResponse,
  type PlannerSearchStatus,
} from './plannerActiveSearchContract';

export {
  classifyPlannerSearchErrorLike,
  hasVisiblePlannerSearchResults,
  normalizePlannerSearchInput,
  shouldRunPlannerSearch,
  type PlannerSearchContext,
  type PlannerSearchDestination,
  type PlannerSearchEntityType,
  type PlannerSearchGroup,
  type PlannerSearchResponse,
  type PlannerSearchResult,
  type PlannerSearchStatus,
} from './plannerActiveSearchContract';

export function classifyPlannerSearchError(error: unknown, staleResponse: PlannerSearchResponse | null): PlannerSearchStatus {
  if (error instanceof AbortError || (error instanceof Error && error.name === 'AbortError')) {
    return { kind: 'loading', stale: staleResponse !== null };
  }

  const record = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  return classifyPlannerSearchErrorLike({
    name: error instanceof Error ? error.name : null,
    code: typeof record.code === 'string' ? record.code : null,
    status: typeof record.status === 'number' ? record.status : null,
    isNetworkError: error instanceof TypeError,
    message: error instanceof Error ? error.message : null,
    staleResponse,
  });
}

export async function fetchPlannerActiveSearch(params: {
  readonly accessToken: string;
  readonly query: string;
  readonly limit?: number;
  readonly signal?: AbortSignal | null;
  readonly timeoutMs?: number;
  readonly contextScope?: string | null;
}): Promise<PlannerSearchResponse> {
  const query = normalizePlannerSearchInput(params.query);
  const search = new URLSearchParams();
  search.set('context', 'active');
  search.set('q', query);
  if (params.limit) search.set('limit', String(params.limit));

  return requestJson<PlannerSearchResponse>(`/api/planner/search?${search.toString()}`, {
    accessToken: params.accessToken,
    operationKind: OPERATION_KINDS.READ_ONLY,
    signal: params.signal,
    timeoutMs: params.timeoutMs ?? 8000,
    contextScope: params.contextScope,
  });
}
