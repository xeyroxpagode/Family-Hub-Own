import { OPERATION_KINDS, requestJson } from '../api';
import type { AttentionResponse } from './plannerAttention';

export async function fetchPlannerAttentionRequest(params: {
  readonly accessToken: string;
  readonly limit?: number;
  readonly signal?: AbortSignal | null;
  readonly timeoutMs?: number;
  readonly contextScope?: string | null;
}): Promise<AttentionResponse> {
  const search = new URLSearchParams();
  if (params.limit) search.set('limit', String(params.limit));

  const qs = search.toString();
  return requestJson<AttentionResponse>(`/api/planner/attention${qs ? '?' + qs : ''}`, {
    accessToken: params.accessToken,
    operationKind: OPERATION_KINDS.READ_ONLY,
    signal: params.signal,
    timeoutMs: params.timeoutMs ?? 8000,
    contextScope: params.contextScope,
  });
}