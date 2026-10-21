/**
 * HOMePLUS Assets — S7-05: cliente del read model "Próximo" y de la
 * creación de items de Planner desde un activo.
 *
 * Reglas de transporte (mismas que el resto del dominio Assets):
 * - Lecturas: READ_ONLY, sin identidad de mutación.
 * - Creaciones: CREATE_IDEMPOTENT con la identidad que trae el CALLER
 *   (composer). Este módulo NUNCA genera ni regenera una Idempotency-Key:
 *   generarla tras un timeout/5xx duplicaría la Task/Event.
 * - El cliente NO puede inyectar origin_*: el backend lo compone.
 *
 * Outcome desconocido (S7-09): cuando la escritura pudo haberse aplicado pero
 * no se pudo confirmar, el cliente RECONCILIA primero (relee el read model)
 * y sólo si el item NO existe deja propagar el error para un reintento con
 * la MISMA clave. Nunca crea un segundo item a ciegas.
 */

import { requestJson } from '../api';
import { idempotentOptions, readOptions, type AssetsRequestOptions } from './client';
import { assetsKeys } from './assetsKeys';
import { assetsCache } from './assetsCache';
import { toAssetsFailure } from './errors';
import type { AssetsMutationIntent } from './intent';

export type AssetPlannerItemKind = 'task' | 'event';

export type AssetPlannerItemDto = {
  kind: AssetPlannerItemKind;
  id: string;
  title: string;
  effective_at: string | null;
  effective_date: string | null;
  effective_time: string | null;
  overdue: boolean;
  status: string;
  version: number | null;
};

export type AssetPlannerItemsResponse = {
  items: AssetPlannerItemDto[];
  total: number;
  limit: number;
};

export type AssetPlannerTaskPayload = {
  title: string;
  description?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  priority?: string | null;
  category?: string | null;
  assigned_to_member_id?: string | null;
  requires_verification?: boolean;
  estimated_duration_minutes?: number | null;
};

export type AssetPlannerEventPayload = {
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at?: string | null;
  all_day?: boolean;
  location_name?: string | null;
  recurrence?: 'none';
};

const normalizeItem = (raw: unknown): AssetPlannerItemDto => {
  const record = (raw ?? {}) as Record<string, unknown>;
  const kind = record.kind === 'event' ? 'event' : 'task';
  return {
    kind,
    id: String(record.id ?? ''),
    title: String(record.title ?? ''),
    effective_at: typeof record.effective_at === 'string' ? record.effective_at : null,
    effective_date: typeof record.effective_date === 'string' ? record.effective_date : null,
    effective_time: typeof record.effective_time === 'string' ? record.effective_time : null,
    overdue: record.overdue === true,
    status: String(record.status ?? ''),
    version: typeof record.version === 'number' ? record.version : null,
  };
};

const plannerItemsPath = (assetId: string) => `/api/assets/${assetId}/planner-items`;

/**
 * Descripcion inicial congelada (S7 prefill). Es un SEED: el composer la
 * escribe una vez y nunca vuelve a sobrescribir lo que el usuario modificó.
 * El backend aplica el mismo texto si la clave 'description' no viaja.
 */
export const assetPlannerDescription = (assetName: string): string =>
  `Programado para el activo «${assetName}».`;

/** Read model "Próximo": Tasks + Events que referencian el activo. */
export const listAssetPlannerItems = async (
  accessToken: string,
  assetId: string,
  params?: { limit?: number },
  options?: AssetsRequestOptions,
): Promise<AssetPlannerItemsResponse> => {
  const query = params?.limit === undefined ? '' : `?limit=${params.limit}`;
  const raw = await requestJson<{ items?: unknown[]; total?: number; limit?: number }>(
    `${plannerItemsPath(assetId)}${query}`,
    readOptions(accessToken, options),
  );
  return {
    items: (raw?.items ?? []).map(normalizeItem),
    total: typeof raw?.total === 'number' ? raw.total : 0,
    limit: typeof raw?.limit === 'number' ? raw.limit : (params?.limit ?? 3),
  };
};

/**
 * Crea una Task de Planner desde el activo. La identidad del intento la
 * decide el caller (composer): este módulo sólo la transporta.
 */
export const createAssetPlannerTask = async (
  accessToken: string,
  householdId: string,
  assetId: string,
  body: AssetPlannerTaskPayload,
  intent: AssetsMutationIntent,
  options?: AssetsRequestOptions,
): Promise<AssetPlannerItemDto> => {
  const raw = await requestJson<{ item?: unknown }>(
    plannerItemsPath(assetId),
    idempotentOptions(accessToken, intent, { kind: 'task', ...body }, options),
  );
  const item = normalizeItem(raw?.item);
  invalidateAssetPlannerItems(householdId, assetId);
  return item;
};

/** Crea un Event de Planner desde el activo. */
export const createAssetPlannerEvent = async (
  accessToken: string,
  householdId: string,
  assetId: string,
  body: AssetPlannerEventPayload,
  intent: AssetsMutationIntent,
  options?: AssetsRequestOptions,
): Promise<AssetPlannerItemDto> => {
  const raw = await requestJson<{ item?: unknown }>(
    plannerItemsPath(assetId),
    idempotentOptions(accessToken, intent, { kind: 'event', ...body }, options),
  );
  const item = normalizeItem(raw?.item);
  invalidateAssetPlannerItems(householdId, assetId);
  return item;
};

/**
 * Invalida el read model del activo (y su detalle). Invalidación dirigida:
 * no hay invalidación global ni event bus cross-domain.
 */
export const invalidateAssetPlannerItems = (householdId: string, assetId: string) => {
  const scope = { householdId };
  let count = 0;
  if (assetsCache.invalidate(assetsKeys.plannerItems(scope, assetId))) count += 1;
  if (assetsCache.invalidate(assetsKeys.detail(scope, assetId))) count += 1;
  return count;
};

type ReconcileDescriptor = {
  kind: AssetPlannerItemKind;
  title: string;
  effectiveAt?: string | null;
};

const matchesDescriptor = (item: AssetPlannerItemDto, descriptor: ReconcileDescriptor) => {
  if (item.kind !== descriptor.kind) return false;
  if (item.title.trim() !== descriptor.title.trim()) return false;
  if (descriptor.effectiveAt) {
    return item.effective_at === descriptor.effectiveAt;
  }
  return true;
};

/**
 * Resultado de un create con reconciliación:
 *   - `created`  la escritura se confirmó.
 *   - `reconciled` la escritura se aplicó pero no se pudo confirmar: el
 *     read model la muestra, así que NO se reintenta (no hay duplicado).
 *   - `failed`    error definitivo: no se reintenta.
 *   - `unknown`   outcome desconocido y el item NO aparece: el caller puede
 *                 reintentar con la MISMA clave (el draft se conserva).
 */
export type AssetPlannerCreateOutcome =
  | { status: 'created' | 'reconciled'; item: AssetPlannerItemDto }
  | { status: 'failed'; error: unknown; failure: ReturnType<typeof toAssetsFailure> }
  | { status: 'unknown'; error: unknown; failure: ReturnType<typeof toAssetsFailure> };

/**
 * Create con reconciliación ante outcome desconocido.
 *
 * El `intent` se reutiliza tal cual en el reintento: la identidad del
 * intento pertenece al composer, no a este módulo.
 */
export const createAssetPlannerItem = async (
  accessToken: string,
  householdId: string,
  assetId: string,
  body: AssetPlannerTaskPayload | AssetPlannerEventPayload,
  kind: AssetPlannerItemKind,
  intent: AssetsMutationIntent,
  options?: AssetsRequestOptions,
): Promise<AssetPlannerCreateOutcome> => {
  try {
    const item = kind === 'task'
      ? await createAssetPlannerTask(
        accessToken,
        householdId,
        assetId,
        body as AssetPlannerTaskPayload,
        intent,
        options,
      )
      : await createAssetPlannerEvent(
        accessToken,
        householdId,
        assetId,
        body as AssetPlannerEventPayload,
        intent,
        options,
      );
    return { status: 'created', item };
  } catch (error) {
    const failure = toAssetsFailure(error);
    if (failure.kind !== 'unknown_outcome') {
      return { status: 'failed', error, failure };
    }

    // Outcome desconocido: reconciliar ANTES de reintentar.
    invalidateAssetPlannerItems(householdId, assetId);
    try {
      const listed = await listAssetPlannerItems(accessToken, assetId, { limit: 20 });
      const descriptor: ReconcileDescriptor = {
        kind,
        title: (body as { title?: string }).title ?? '',
        effectiveAt: kind === 'event'
          ? (body as AssetPlannerEventPayload).starts_at ?? null
          : null,
      };
      const existing = listed.items.find((item) => matchesDescriptor(item, descriptor));
      if (existing) {
        return { status: 'reconciled', item: existing };
      }
    } catch {
      // La reconciliación falló: el outcome sigue siendo desconocido.
    }
    return { status: 'unknown', error, failure };
  }
};
