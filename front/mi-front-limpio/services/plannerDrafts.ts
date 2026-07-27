import { OPERATION_KINDS, requestJson } from './api';
import { createIdempotencyKey } from './idempotency';
import type { PlannerDraft, PlannerPayloadEnvelope } from '../types/plannerPresetsDrafts';

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

export type AutosavePlannerDraftPayload = {
  client_draft_key: string;
  entity_type: PlannerDraft['entity_type'];
  intended_scope: PlannerDraft['intended_scope'];
  intended_household_id?: string | null;
  source_preset_id?: string | null;
  source_preset_revision_id?: string | null;
  adapter_key: string;
  payload_envelope?: PlannerPayloadEnvelope;
  payload?: Record<string, unknown>;
};

export const listPlannerDrafts = (accessToken: string) =>
  requestJson<{ drafts: PlannerDraft[] }>('/api/planner/drafts', { accessToken });

export const getPlannerDraft = (accessToken: string, draftId: string) =>
  requestJson<{ draft: PlannerDraft }>(`/api/planner/drafts/${draftId}`, { accessToken });

export const recoverPlannerDraft = (accessToken: string, clientDraftKey: string, entityType: PlannerDraft['entity_type']) =>
  requestJson<{ draft: PlannerDraft }>(
    `/api/planner/drafts/recover?client_draft_key=${encodeURIComponent(clientDraftKey)}&entity_type=${entityType}`,
    { accessToken },
  );

export const autosavePlannerDraft = (
  accessToken: string,
  payload: AutosavePlannerDraftPayload,
  options?: MutationOptions,
) =>
  requestJson<{ data: PlannerDraft; outcome: string; version: number }>('/api/planner/drafts/autosave', {
    method: 'POST',
    operationKind: options?.expectedVersion ? OPERATION_KINDS.VERSIONED_MUTATION : OPERATION_KINDS.CREATE_IDEMPOTENT,
    accessToken,
    headers: mutationHeaders('planner.drafts.autosave', options),
    body: payload,
  });

export const trashPlannerDraft = (accessToken: string, draftId: string, options: MutationOptions) =>
  requestJson<{ data: PlannerDraft; outcome: string; version: number }>(`/api/planner/drafts/${draftId}/trash`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    headers: mutationHeaders('planner.drafts.trash', options),
  });

export const restorePlannerDraft = (accessToken: string, draftId: string, options: MutationOptions) =>
  requestJson<{ data: PlannerDraft; outcome: string; version: number }>(`/api/planner/drafts/${draftId}/restore`, {
    method: 'POST',
    operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
    accessToken,
    headers: mutationHeaders('planner.drafts.restore', options),
  });

export const preparePlannerDraftActivation = (accessToken: string, draftId: string) =>
  requestJson<{ data: Record<string, unknown>; outcome: string; version: number }>(`/api/planner/drafts/${draftId}/prepare`, {
    accessToken,
  });
