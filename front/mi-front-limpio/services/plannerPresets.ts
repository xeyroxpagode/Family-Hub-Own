/**
 * Planner V1 — M11 Presets/Drafts Frontend — Presets service.
 *
 * Lane-owned HTTP transport for the Presets surface. Reuses Core `requestJson`
 * and the canonical Planner mutation identity headers (`Idempotency-Key`,
 * `X-Mutation-Id`, `If-Match`). Service signatures map 1:1 to the backend
 * routes published by `routes/planner.presets-drafts.js`.
 *
 * Binding rules:
 * - No actor / person ID / member ID is sent as authority — backend resolves
 *   context from the access token.
 * - Outcomes recognized by the service mirror the canonical mutation result
 *   envelope: `created | updated | noop | replay`.
 * - A retry of an uncertain intent MUST reuse the same `mutationId` and
 *   `idempotencyKey` (callers pass them back via `MutationOptions`).
 */
import { OPERATION_KINDS, requestJson } from './api';
import { createIdempotencyKey, generateMutationId } from './api';
import type {
  PlannerPayloadEnvelope,
  PlannerPreset,
  PlannerPresetRevision,
} from '../types/plannerPresetsDrafts';

export type PlannerPresetMutationOptions = {
  expectedVersion?: number;
  idempotencyKey?: string;
  mutationId?: string;
};

const mutationHeaders = (operation: string, options?: PlannerPresetMutationOptions) => {
  const headers: Record<string, string> = {
    'Idempotency-Key': options?.idempotencyKey ?? createIdempotencyKey(operation),
  };
  if (options?.expectedVersion !== undefined) headers['If-Match'] = String(options.expectedVersion);
  if (options?.mutationId) headers['X-Mutation-Id'] = options.mutationId;
  return headers;
};

export const listPlannerPresets = (
  accessToken: string,
  filters?: Record<string, string | number | boolean>,
) => {
  const params = new URLSearchParams();
  Object.entries(filters ?? {}).forEach(([key, value]) => params.append(key, String(value)));
  const query = params.toString();
  return requestJson<{ presets: PlannerPreset[] }>(
    `/api/planner/presets${query ? `?${query}` : ''}`,
    { accessToken },
  );
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
  options?: PlannerPresetMutationOptions,
) =>
  requestJson<{ data: PlannerPreset; outcome: string; version: number; operationId?: string }>(
    '/api/planner/presets',
    {
      method: 'POST',
      operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
      accessToken,
      headers: mutationHeaders('planner.presets.create', options),
      body: payload,
    },
  );

export const updatePlannerPresetMetadata = (
  accessToken: string,
  presetId: string,
  payload: { name: string },
  options: PlannerPresetMutationOptions,
) =>
  requestJson<{ data: PlannerPreset; outcome: string; version: number; operationId?: string }>(
    `/api/planner/presets/${presetId}`,
    {
      method: 'PATCH',
      operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
      accessToken,
      headers: mutationHeaders('planner.presets.update', options),
      body: payload,
    },
  );

export const startPlannerPresetRevision = (
  accessToken: string,
  presetId: string,
  options?: PlannerPresetMutationOptions,
) =>
  requestJson<{ data: PlannerPresetRevision; outcome: string; version: number; operationId?: string }>(
    `/api/planner/presets/${presetId}/revisions`,
    {
      method: 'POST',
      operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
      accessToken,
      headers: mutationHeaders('planner.presets.revisions.start', options),
    },
  );

export const listPlannerPresetRevisions = (accessToken: string, presetId: string) =>
  requestJson<{ revisions: PlannerPresetRevision[] }>(
    `/api/planner/presets/${presetId}/revisions`,
    { accessToken },
  );

export const getPlannerPresetRevision = (accessToken: string, revisionId: string) =>
  requestJson<{ revision: PlannerPresetRevision }>(`/api/planner/preset-revisions/${revisionId}`, {
    accessToken,
  });

export const updatePlannerPresetRevisionDraft = (
  accessToken: string,
  revisionId: string,
  payload: { adapter_key?: string; payload?: Record<string, unknown> },
  options: PlannerPresetMutationOptions,
) =>
  requestJson<{ data: PlannerPresetRevision; outcome: string; version: number; operationId?: string }>(
    `/api/planner/preset-revisions/${revisionId}`,
    {
      method: 'PATCH',
      operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
      accessToken,
      headers: mutationHeaders('planner.presets.revisions.update', options),
      body: payload,
    },
  );

export const publishPlannerPresetRevision = (
  accessToken: string,
  revisionId: string,
  options: PlannerPresetMutationOptions,
) =>
  requestJson<{ data: PlannerPreset; outcome: string; version: number; operationId?: string }>(
    `/api/planner/preset-revisions/${revisionId}/publish`,
    {
      method: 'POST',
      operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
      accessToken,
      headers: mutationHeaders('planner.presets.revisions.publish', options),
    },
  );

export const trashPlannerPreset = (
  accessToken: string,
  presetId: string,
  options: PlannerPresetMutationOptions,
) =>
  requestJson<{ data: PlannerPreset; outcome: string; version: number; operationId?: string }>(
    `/api/planner/presets/${presetId}/trash`,
    {
      method: 'POST',
      operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
      accessToken,
      headers: mutationHeaders('planner.presets.trash', options),
    },
  );

export const restorePlannerPreset = (
  accessToken: string,
  presetId: string,
  options: PlannerPresetMutationOptions,
) =>
  requestJson<{ data: PlannerPreset; outcome: string; version: number; operationId?: string }>(
    `/api/planner/presets/${presetId}/restore`,
    {
      method: 'POST',
      operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
      accessToken,
      headers: mutationHeaders('planner.presets.restore', options),
    },
  );

export const preparePlannerPresetApplication = (accessToken: string, presetId: string, revisionId?: string) =>
  requestJson<{
    data: Record<string, unknown>;
    outcome: string;
    version: number;
    unresolvedPlaceholders?: unknown[];
    warnings?: unknown[];
  }>(`/api/planner/presets/${presetId}/prepare${revisionId ? `?revision_id=${encodeURIComponent(revisionId)}` : ''}`, {
    accessToken,
  });

/**
 * Build a fresh mutation identity (mutation id + idempotency key) for a new
 * Presets/Drafts intent. Used by adapters when starting a new autosave or
 * preset create session. The returned identity is stable across retries of
 * the same intent.
 */
export function createPlannerPresetIdentity(operation: string): {
  idempotencyKey: string;
  mutationId: string;
} {
  return {
    idempotencyKey: createIdempotencyKey(operation),
    mutationId: generateMutationId(),
  };
}
