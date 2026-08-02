import { OPERATION_KINDS, requestJson } from '../api';
import type { ActivityResponse } from './plannerActivity';

export async function fetchPlannerActivityRequest(params: {
  readonly accessToken: string;
  readonly limit?: number;
  readonly signal?: AbortSignal | null;
  readonly timeoutMs?: number;
  readonly contextScope?: string | null;
}): Promise<ActivityResponse> {
  const search = new URLSearchParams();
  if (params.limit) search.set('limit', String(params.limit));
  const query = search.toString();

  return requestJson<ActivityResponse>(`/api/planner/activity${query ? '?' + query : ''}`, {
    accessToken: params.accessToken,
    operationKind: OPERATION_KINDS.READ_ONLY,
    signal: params.signal,
    timeoutMs: params.timeoutMs ?? 8000,
    contextScope: params.contextScope,
  });
}
