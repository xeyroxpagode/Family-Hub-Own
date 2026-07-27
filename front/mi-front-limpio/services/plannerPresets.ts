import { OPERATION_KINDS, requestJson } from './api';
import { createIdempotencyKey } from './idempotency';
import type { PlannerPayloadEnvelope, PlannerPreset, PlannerPresetRevision } from '../types/plannerPresetsDrafts';

type MutationOptions = {
  expectedVersion?: number;
  idempotencyKey?: string;
  mutationId?: string;
};

const mutationHeaders = (operation: string, options?: MutationOptions) => {
  const headers: Record<string, string> = {
    'Idempotency-Key': options?.idempotencyKey ?? createIdempotencyKey(operation),
  };
  if (options?.expectedVersion !== undefined) headers['If-Match'] = String(options.expectedVersion);
  if (options?.mutationId) headers['X-Mutation-Id'] = options.mutationId;
  return headers;
};

export const listPlannerPresets = (accessToken: string, filters?: Record<string, string | number | boolean>) => {
  const params = new URLSearchParams();
  Object.entries(filters ?? {}).forEach(([key, value]) => params.append(key, String(value)));
  const query = params.toString();
  return requestJson<{ presets: PlannerPreset[] }>(`/api/planner/presets${query ? `?${query}` : ''}`, { accessToken });
};

export const getPlannerPreset = (accessToken: string, presetId: string) =>
  requestJson<{ preset: PlannerPreset }>(`/api/planner/presets/${presetId}`, { accessToken });

export const createPlannerPreset = (
  accessToken: string,
  payload: {
    name: string;
    entity_type: PlannerPreset['entity_type'];
    source?: PlannerPreset['source'];
    adapter_key: string;
    payload_envelope?: PlannerPayloadEnvelope;
    payload?: Record<string, unknown>;
  },
  options?: MutationOptions,
) =>
  requestJson<{ data: PlannerPreset; outcome: string; version: number }>('/api/planner/presets', {
    method: 'POST',
    operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
    accessToken,
    headers: mutationHeaders('planner.presets.create', options),
    body: payload,
  });

export const updatePlannerPresetMetadata = (
  accessToken: string,
  presetId: string,
  payload: { name: string },
  options: MutationOptions,
) =>
  requestJson<{ data: PlannerPreset; outcome: string; version: number }>(`/api/planner/presets/${presetId}`, {
    method: 'PATCH',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    headers: mutationHeaders('planner.presets.update', options),
    body: payload,
  });

export const startPlannerPresetRevision = (accessToken: string, presetId: string, options?: MutationOptions) =>
  requestJson<{ data: PlannerPresetRevision; outcome: string; version: number }>(`/api/planner/presets/${presetId}/revisions`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
    accessToken,
    headers: mutationHeaders('planner.presets.revisions.start', options),
  });

export const publishPlannerPresetRevision = (accessToken: string, revisionId: string, options: MutationOptions) =>
  requestJson<{ data: PlannerPreset; outcome: string; version: number }>(`/api/planner/preset-revisions/${revisionId}/publish`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    headers: mutationHeaders('planner.presets.revisions.publish', options),
  });

export const preparePlannerPresetApplication = (accessToken: string, presetId: string, revisionId?: string) =>
  requestJson<{ data: Record<string, unknown>; outcome: string; version: number }>(
    `/api/planner/presets/${presetId}/prepare${revisionId ? `?revision_id=${encodeURIComponent(revisionId)}` : ''}`,
    { accessToken },
  );
