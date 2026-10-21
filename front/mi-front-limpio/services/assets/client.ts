/**
 * HOMePLUS Assets — F0 Foundation. Adapters API ↔ backend A1–A6.3.
 *
 * Rutas verificadas en `backend/src/routes/assets.js`. Contratos verificados
 * en `backend/src/services/assets.service.js`.
 *
 * Reglas de transporte:
 * - Lecturas: READ_ONLY, sin identidad de mutación.
 * - Creaciones y transiciones con Idempotency-Key requerida por backend:
 *   CREATE_IDEMPOTENT + intent del caller (nunca regenerada aquí).
 * - Concurrencia por snapshot: `expected_updated_at` viaja en body
 *   (y/o header If-Match como string ISO); nunca last-write-wins.
 * - Household: siempre derivado del contexto autenticado en servidor; el
 *   cliente NUNCA envía household_id en body.
 * - Decodificación defensiva: identifiers siempre objeto, category null
 *   por defecto. Lo desconocido se tolera, no se exige.
 */

import { OPERATION_KINDS, requestJson } from '../api';
import {
  normalizeAsset,
  type AssetHolderValue,
  type AssetPlacementValue,
} from './assetProjection';
import type {
  AssetCategory,
  AssetLifecycleStatus,
  AssetListFilters,
  AssetListResponse,
  AssetListScope,
  AssetProfile,
  AssetRecordDto,
  AssetsCapabilityProjection,
  CareListScope,
  CreateAssetPayload,
  ManualCareDto,
} from './types';
import type { AssetsMutationIntent } from './intent';

export {
  holderValueOf,
  placementValueOf,
  normalizeAsset,
  normalizeHolder,
  normalizePlacement,
  normalizeResponsible,
} from './assetProjection';
export type { AssetHolderValue, AssetPlacementValue } from './assetProjection';

export type AssetsRequestOptions = {
  signal?: AbortSignal | null;
  timeoutMs?: number;
  contextScope?: string | null;
};

export type MutationCallOptions = AssetsRequestOptions & {
  intent: AssetsMutationIntent;
};

type ListAssetsRaw = {
  scope: AssetListScope;
  assets: unknown[];
  nextOffset: number | null;
};

const toQuery = (filters?: AssetListFilters): string => {
  const params = new URLSearchParams();
  if (filters?.scope) params.append('scope', filters.scope);
  if (filters?.profile) params.append('profile', filters.profile);
  if (filters?.category_id) params.append('category_id', filters.category_id);
  if (filters?.q !== undefined && filters.q.trim() !== '') params.append('q', filters.q.trim());
  if (filters?.limit !== undefined) params.append('limit', String(filters.limit));
  if (filters?.offset !== undefined) params.append('offset', String(filters.offset));
  const query = params.toString();
  return query ? `?${query}` : '';
};

const readOptions = (accessToken: string, options?: AssetsRequestOptions) => ({
  accessToken,
  operationKind: OPERATION_KINDS.READ_ONLY,
  signal: options?.signal,
  timeoutMs: options?.timeoutMs,
  contextScope: options?.contextScope,
});

const idempotentOptions = (
  accessToken: string,
  intent: AssetsMutationIntent,
  body: unknown,
  options?: AssetsRequestOptions,
) => ({
  accessToken,
  operationKind: OPERATION_KINDS.CREATE_IDEMPOTENT,
  mutationId: intent.mutationId,
  idempotencyKey: intent.idempotencyKey,
  body,
  signal: options?.signal,
  timeoutMs: options?.timeoutMs,
  contextScope: options?.contextScope,
});

// S7: los builders de transporte son parte del contrato interno del dominio
// Assets: plannerItems.ts los reutiliza en vez de reimplementarlos.
export { readOptions, idempotentOptions };

const versionedOptions = (
  accessToken: string,
  intent: AssetsMutationIntent,
  body: unknown,
  expectedUpdatedAt: string,
  options?: AssetsRequestOptions,
) => ({
  accessToken,
  operationKind: OPERATION_KINDS.VERSIONED_MUTATION,
  mutationId: intent.mutationId,
  idempotencyKey: intent.idempotencyKey,
  body,
  headers: { 'If-Match': expectedUpdatedAt },
  signal: options?.signal,
  timeoutMs: options?.timeoutMs,
  contextScope: options?.contextScope,
});

// ── Reads ────────────────────────────────────────────────────────────────────

export const listAssets = (
  accessToken: string,
  filters?: AssetListFilters,
  options?: AssetsRequestOptions,
) =>
  requestJson<ListAssetsRaw>(`/api/assets${toQuery(filters)}`, readOptions(accessToken, options)).then(
    (raw) => ({
      scope: raw.scope,
      assets: (raw.assets ?? []).map(normalizeAsset),
      nextOffset: raw.nextOffset,
    }) satisfies AssetListResponse,
  );

export const getAssetById = (
  accessToken: string,
  assetId: string,
  options?: AssetsRequestOptions,
) =>
  requestJson<{ asset: unknown }>(
    `/api/assets/${assetId}`,
    readOptions(accessToken, options),
  ).then((raw) => ({ asset: normalizeAsset(raw.asset) }));

export const listCategories = (accessToken: string, options?: AssetsRequestOptions) =>
  requestJson<{ categories: AssetCategory[] }>(
    '/api/assets/categories',
    readOptions(accessToken, options),
  );

/**
 * Proyección de capabilities del miembro activo (GET /api/assets/capabilities).
 *
 * El backend es la autoridad: esta proyección es la MISMA que usa el service
 * para autorizar cada mutación. La UI la usa sólo para mostrar u ocultar
 * controles (nunca como decisión de seguridad).
 */
export type AssetsCapabilitiesResponse = {
  capabilities: AssetsCapabilityProjection;
  membershipId: string;
  householdId: string;
  role: string;
};

export const fetchAssetsCapabilities = (
  accessToken: string,
  options?: AssetsRequestOptions,
) =>
  requestJson<AssetsCapabilitiesResponse>(
    '/api/assets/capabilities',
    readOptions(accessToken, options),
  );

export const listAssetRecords = (
  accessToken: string,
  assetId: string,
  scope: 'active' | 'removed' = 'active',
  options?: AssetsRequestOptions,
) =>
  requestJson<{ asset_id: string; scope: string; records: AssetRecordDto[] }>(
    `/api/assets/${assetId}/records?scope=${scope}`,
    readOptions(accessToken, options),
  );

/**
 * BG-02 — descubrimiento de Records compartibles del Household (paginado,
 * server-side). `excludeAssetId` omite los ya vinculados a ese Asset.
 */
export const listHouseholdRecords = (
  accessToken: string,
  filters?: { q?: string; exclude_asset_id?: string; limit?: number; offset?: number },
  options?: AssetsRequestOptions,
) => {
  const params = new URLSearchParams();
  if (filters?.q && filters.q.trim() !== '') params.append('q', filters.q.trim());
  if (filters?.exclude_asset_id) params.append('exclude_asset_id', filters.exclude_asset_id);
  if (filters?.limit !== undefined) params.append('limit', String(filters.limit));
  if (filters?.offset !== undefined) params.append('offset', String(filters.offset));
  const query = params.toString();
  return requestJson<{ records: AssetRecordDto[]; nextOffset: number | null }>(
    `/api/assets/records${query ? `?${query}` : ''}`,
    readOptions(accessToken, options),
  );
};

export const getAssetRecordById = (
  accessToken: string,
  recordId: string,
  options?: AssetsRequestOptions,
) =>
  requestJson<{ record: AssetRecordDto }>(
    `/api/assets/records/${recordId}`,
    readOptions(accessToken, options),
  );

export const listAssetCare = (
  accessToken: string,
  assetId: string,
  scope: CareListScope = 'active',
  options?: AssetsRequestOptions,
) =>
  requestJson<{ asset_id: string; scope: string; care: ManualCareDto[] }>(
    `/api/assets/${assetId}/care?scope=${scope}`,
    readOptions(accessToken, options),
  );

export const getManualCareById = (
  accessToken: string,
  careId: string,
  options?: AssetsRequestOptions,
) =>
  requestJson<{ care: ManualCareDto }>(
    `/api/assets/care/${careId}`,
    readOptions(accessToken, options),
  );

export const getArchiveHistory = (
  accessToken: string,
  assetId: string,
  options?: AssetsRequestOptions,
) =>
  requestJson<{ asset_id: string; episodes: unknown[] }>(
    `/api/assets/${assetId}/archive-history`,
    readOptions(accessToken, options),
  );

export const getTrashHistory = (
  accessToken: string,
  assetId: string,
  options?: AssetsRequestOptions,
) =>
  requestJson<{ asset_id: string; episodes: unknown[] }>(
    `/api/assets/${assetId}/trash-history`,
    readOptions(accessToken, options),
  );

// ── Create / identity / category ─────────────────────────────────────────────

export const createAsset = (
  accessToken: string,
  payload: CreateAssetPayload,
  call: MutationCallOptions,
) =>
  requestJson<{ asset: unknown }>('/api/assets', {
    ...idempotentOptions(accessToken, call.intent, payload, call),
    method: 'POST',
  }).then((raw) => ({ asset: normalizeAsset(raw.asset) }));

export const updateAssetName = (
  accessToken: string,
  assetId: string,
  payload: { name: string; expected_updated_at: string },
  call: MutationCallOptions,
) =>
  requestJson<{ asset: unknown }>(`/api/assets/${assetId}`, {
    ...versionedOptions(accessToken, call.intent, payload, payload.expected_updated_at, call),
    method: 'PATCH',
  }).then((raw) => ({ asset: normalizeAsset(raw.asset) }));

export type UpdateAssetIdentityPayload = {
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  identifiers?: Record<string, string>;
  expected_identity: {
    brand: string | null;
    model: string | null;
    serial_number: string | null;
    identifiers: Record<string, string>;
  };
};

export const updateAssetIdentity = (
  accessToken: string,
  assetId: string,
  payload: UpdateAssetIdentityPayload,
  call: MutationCallOptions,
) =>
  requestJson<{ asset: unknown }>(`/api/assets/${assetId}/identity`, {
    ...idempotentOptions(accessToken, call.intent, payload, call),
    method: 'PATCH',
  }).then((raw) => ({ asset: normalizeAsset(raw.asset) }));

export const setAssetCategory = (
  accessToken: string,
  assetId: string,
  payload: { category_id: string | null; expected_category_id: string | null },
  call: MutationCallOptions,
) =>
  requestJson<{ asset: unknown }>(`/api/assets/${assetId}/category`, {
    ...idempotentOptions(accessToken, call.intent, payload, call),
    method: 'PATCH',
  }).then((raw) => ({ asset: normalizeAsset(raw.asset) }));

export const createCategory = (
  accessToken: string,
  payload: { name: string },
  call: MutationCallOptions,
) =>
  requestJson<{ category: AssetCategory; created: boolean }>(
    '/api/assets/categories',
    {
      ...idempotentOptions(accessToken, call.intent, payload, call),
      method: 'POST',
    },
  );

export const deleteCategory = (
  accessToken: string,
  categoryId: string,
  call: MutationCallOptions,
) =>
  requestJson<{ category: AssetCategory }>(`/api/assets/categories/${categoryId}`, {
    ...idempotentOptions(accessToken, call.intent, {}, call),
    method: 'DELETE',
  });

// ── Contexto (tres dimensiones independientes, sin "guardar todo") ───────────
// Formas exactas de body por dimensión se reconcilian contra el service en F3;
// el transporte ya impone pending/error/éxito localizados por dimensión.

export const setAssetResponsible = (
  accessToken: string,
  assetId: string,
  payload: { responsible_member_id: string | null; expected_responsible_member_id: string | null },
  call: MutationCallOptions,
) =>
  requestJson<{ asset: unknown }>(`/api/assets/${assetId}/responsible`, {
    ...idempotentOptions(accessToken, call.intent, payload, call),
    method: 'PATCH',
  }).then((raw) => ({ asset: normalizeAsset(raw.asset) }));

export const setAssetHolder = (
  accessToken: string,
  assetId: string,
  payload: { holder: AssetHolderValue; expected_holder: AssetHolderValue },
  call: MutationCallOptions,
) =>
  requestJson<{ asset: unknown }>(`/api/assets/${assetId}/holder`, {
    ...idempotentOptions(accessToken, call.intent, payload, call),
    method: 'PATCH',
  }).then((raw) => ({ asset: normalizeAsset(raw.asset) }));

export const setAssetPlacement = (
  accessToken: string,
  assetId: string,
  payload: { placement: AssetPlacementValue; expected_placement: AssetPlacementValue },
  call: MutationCallOptions,
) =>
  requestJson<{ asset: unknown }>(`/api/assets/${assetId}/placement`, {
    ...idempotentOptions(accessToken, call.intent, payload, call),
    method: 'PATCH',
  }).then((raw) => ({ asset: normalizeAsset(raw.asset) }));

// ── Profile / lifecycle ──────────────────────────────────────────────────────

export const changeAssetProfile = (
  accessToken: string,
  assetId: string,
  payload: { profile: AssetProfile },
  call: MutationCallOptions,
) =>
  requestJson<{ asset: unknown }>(`/api/assets/${assetId}/profile`, {
    ...idempotentOptions(accessToken, call.intent, payload, call),
    method: 'PATCH',
  }).then((raw) => ({ asset: normalizeAsset(raw.asset) }));

export const setAssetLifecycleStatus = (
  accessToken: string,
  assetId: string,
  payload: {
    lifecycle_status: Extract<AssetLifecycleStatus, 'ACTIVE' | 'INACTIVE'>;
    expected_lifecycle_status: AssetLifecycleStatus;
  },
  call: MutationCallOptions,
) =>
  requestJson<{ asset: unknown }>(`/api/assets/${assetId}/lifecycle`, {
    ...idempotentOptions(accessToken, call.intent, payload, call),
    method: 'PATCH',
  }).then((raw) => ({ asset: normalizeAsset(raw.asset) }));

export const archiveAsset = (
  accessToken: string,
  assetId: string,
  payload: {
    expected_lifecycle_status: Extract<AssetLifecycleStatus, 'ACTIVE' | 'INACTIVE'>;
    disposition?: string;
    disposition_note?: string;
  },
  call: MutationCallOptions,
) =>
  requestJson<{ asset: unknown; episode?: unknown }>(`/api/assets/${assetId}/archive`, {
    ...idempotentOptions(accessToken, call.intent, payload, call),
    method: 'POST',
  }).then((raw) => ({ asset: normalizeAsset(raw.asset) }));

export const unarchiveAsset = (
  accessToken: string,
  assetId: string,
  call: MutationCallOptions,
) =>
  requestJson<{ asset: unknown }>(`/api/assets/${assetId}/unarchive`, {
    ...idempotentOptions(accessToken, call.intent, { expected_lifecycle_status: 'ARCHIVED' }, call),
    method: 'POST',
  }).then((raw) => ({ asset: normalizeAsset(raw.asset) }));

export const trashAsset = (
  accessToken: string,
  assetId: string,
  payload: { expected_lifecycle_status: Extract<AssetLifecycleStatus, 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'> },
  call: MutationCallOptions,
) =>
  requestJson<{ asset: unknown }>(`/api/assets/${assetId}/trash`, {
    ...idempotentOptions(accessToken, call.intent, payload, call),
    method: 'POST',
  }).then((raw) => ({ asset: normalizeAsset(raw.asset) }));

export const restoreAsset = (
  accessToken: string,
  assetId: string,
  call: MutationCallOptions,
) =>
  requestJson<{ asset: unknown }>(`/api/assets/${assetId}/restore`, {
    ...idempotentOptions(accessToken, call.intent, { expected_lifecycle_status: 'TRASH' }, call),
    method: 'POST',
  }).then((raw) => ({ asset: normalizeAsset(raw.asset) }));

// ── Records ──────────────────────────────────────────────────────────────────

export type CreateAssetRecordPayload = {
  asset_ids: string[];
  type: string;
  title: string;
  issuer?: string | null;
  identifier?: string | null;
  notes?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
};

export const createAssetRecord = (
  accessToken: string,
  payload: CreateAssetRecordPayload,
  call: MutationCallOptions,
) =>
  requestJson<{ record: AssetRecordDto }>('/api/assets/records', {
    ...idempotentOptions(accessToken, call.intent, payload, call),
    method: 'POST',
  });

export const linkRecordToAsset = (
  accessToken: string,
  recordId: string,
  payload: { asset_id: string },
  call: MutationCallOptions,
) =>
  requestJson<{ record: AssetRecordDto }>(`/api/assets/records/${recordId}/link`, {
    ...idempotentOptions(accessToken, call.intent, payload, call),
    method: 'POST',
  });

export const unlinkRecordFromAsset = (
  accessToken: string,
  recordId: string,
  payload: { asset_id: string },
  call: MutationCallOptions,
) =>
  requestJson<{ record: AssetRecordDto }>(`/api/assets/records/${recordId}/unlink`, {
    ...idempotentOptions(accessToken, call.intent, payload, call),
    method: 'POST',
  });

export const correctAssetRecord = (
  accessToken: string,
  recordId: string,
  payload: Record<string, unknown>,
  call: MutationCallOptions,
) =>
  requestJson<{ record: AssetRecordDto }>(`/api/assets/records/${recordId}`, {
    ...idempotentOptions(accessToken, call.intent, payload, call),
    method: 'PATCH',
  });

export const correctAssetRecordPeriod = (
  accessToken: string,
  recordId: string,
  periodId: string,
  payload: { valid_from?: string | null; valid_until?: string | null; expected_updated_at: string },
  call: MutationCallOptions,
) =>
  requestJson<{ record: AssetRecordDto }>(
    `/api/assets/records/${recordId}/periods/${periodId}`,
    {
      ...versionedOptions(accessToken, call.intent, payload, payload.expected_updated_at, call),
      method: 'PATCH',
    },
  );

export const renewAssetRecord = (
  accessToken: string,
  recordId: string,
  payload: { valid_from?: string | null; valid_until?: string | null; asset_ids: string[] },
  call: MutationCallOptions,
) =>
  requestJson<{ record: AssetRecordDto; new_period_id?: string }>(
    `/api/assets/records/${recordId}/renew`,
    {
      ...idempotentOptions(accessToken, call.intent, payload, call),
      method: 'POST',
    },
  );

export const removeAssetRecord = (
  accessToken: string,
  recordId: string,
  call: MutationCallOptions,
) =>
  requestJson<{ record: AssetRecordDto }>(`/api/assets/records/${recordId}/remove`, {
    ...idempotentOptions(accessToken, call.intent, {}, call),
    method: 'POST',
  });

export const restoreAssetRecord = (
  accessToken: string,
  recordId: string,
  call: MutationCallOptions,
) =>
  requestJson<{ record: AssetRecordDto }>(`/api/assets/records/${recordId}/restore`, {
    ...idempotentOptions(accessToken, call.intent, {}, call),
    method: 'POST',
  });

// ── Care manual ──────────────────────────────────────────────────────────────

export type CreateManualCarePayload = {
  asset_id: string;
  description: string;
  date_precision: 'exact' | 'month_year' | 'year' | 'unknown';
  occurred_on?: string | null;
  occurred_year?: number | null;
  occurred_month?: number | null;
  provider?: string | null;
  notes?: string | null;
};

export const createManualCare = (
  accessToken: string,
  payload: CreateManualCarePayload,
  call: MutationCallOptions,
) =>
  requestJson<{ care: ManualCareDto }>('/api/assets/care', {
    ...idempotentOptions(accessToken, call.intent, payload, call),
    method: 'POST',
  });

export const correctManualCare = (
  accessToken: string,
  careId: string,
  payload: Record<string, unknown> & { expected_updated_at: string },
  call: MutationCallOptions,
) =>
  requestJson<{ care: ManualCareDto }>(`/api/assets/care/${careId}`, {
    ...versionedOptions(accessToken, call.intent, payload, payload.expected_updated_at, call),
    method: 'PATCH',
  });

export const removeManualCare = (
  accessToken: string,
  careId: string,
  call: MutationCallOptions,
) =>
  requestJson<{ care: ManualCareDto }>(`/api/assets/care/${careId}/remove`, {
    ...idempotentOptions(accessToken, call.intent, {}, call),
    method: 'POST',
  });

export const restoreManualCare = (
  accessToken: string,
  careId: string,
  call: MutationCallOptions,
) =>
  requestJson<{ care: ManualCareDto }>(`/api/assets/care/${careId}/restore`, {
    ...idempotentOptions(accessToken, call.intent, {}, call),
    method: 'POST',
  });
