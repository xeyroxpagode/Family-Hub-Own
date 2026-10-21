/**
 * HOMePLUS Assets — ejecución de mutaciones con invalidación de cache.
 *
 * Ciclo por operación: IDLE → PRESSED → ACTION → PENDING → CONFIRMED/FAILED.
 * - Pending: el caller bloquea doble submit ANTES de llamar aquí.
 * - Éxito: invalidación dirigida (detalle + listas del household); el caller
 *   preserva scroll/foco y refleja el valor nuevo del servidor.
 * - Fallo: el draft se conserva en el caller; aquí sólo clasificamos el
 *   outcome (errors.ts) y devolvemos AssetsFailure.
 * - Retry: JAMÁS se regenera la Idempotency-Key (Target §13); el caller
 *   persiste el intent y lo reutiliza.
 */

import { assetsCache } from './assetsCache';
import { assetsKeys } from './assetsKeys';
import { createAssetsIntent } from './intent';
import { toAssetsFailure } from './errors';
import type { AssetsFailure } from './errors';
import type { AssetsHouseholdScope } from './assetsKeys';
import type { AssetsMutationIntent } from './intent';
import type { CreateAssetPayload } from './types';
import * as client from './client';

export type MutationCallOptions = client.AssetsRequestOptions & {
  /** Intent previo conservado (retry / reconciliación). Si no existe, se crea. */
  intent?: AssetsMutationIntent;
};

export type MutationOutcome<T> =
  | { ok: true; data: T }
  | { ok: false; failure: AssetsFailure };

const run = async <T>(
  householdId: string,
  mutation: { kind: 'asset' | 'category' | 'record' | 'care' | 'lifecycle'; action: string; entityId?: string },
  operation: string,
  execute: (intent: AssetsMutationIntent, options: client.AssetsRequestOptions) => Promise<T>,
  options: MutationCallOptions,
  /**
   * Assets afectados por la mutación (para Record/Care, cuyas listas se
   * cachean por Asset). Si no se informa, se deducen de la respuesta.
   */
  affected?: { assetIds?: readonly string[]; fromResponse?: (data: T) => readonly string[] },
): Promise<MutationOutcome<T>> => {
  const intent = options.intent ?? createAssetsIntent(operation);
  const scope: AssetsHouseholdScope = { householdId };
  try {
    const data = await execute(intent, {
      signal: options.signal,
      timeoutMs: options.timeoutMs,
      contextScope: options.contextScope ?? `assets-mutation:${householdId}`,
    });
    const assetIds = affected?.assetIds
      ?? affected?.fromResponse?.(data)
      ?? [];
    assetsCache.executeInvalidation(
      {
        kind: mutation.kind,
        action: mutation.action as never,
        entityId: mutation.entityId,
        assetIds,
      },
      scope,
    );
    return { ok: true, data };
  } catch (error) {
    const failure = toAssetsFailure(error);
    // Un 403 assets_forbidden puede significar que el permiso cambió en la
    // sesión: la proyección cacheada se invalida para que la UI se refresque
    // (el backend sigue siendo la autoridad de cada escritura).
    if (failure.kind === 'forbidden') {
      assetsCache.invalidate(assetsKeys.capabilities({ householdId }));
    }
    return { ok: false, failure };
  }
};

/** Assets relacionados con un Record (la lista de Records se cachea por Asset). */
const recordAssetIds = (data: { record?: { assets?: { asset_id: string }[] } } | undefined): readonly string[] =>
  (data?.record?.assets ?? []).map((link) => link.asset_id).filter(Boolean);

/** Asset dueño de un Care. */
const careAssetIds = (data: { care?: { asset_id?: string } } | undefined): readonly string[] =>
  data?.care?.asset_id ? [data.care.asset_id] : [];

export const mutations = {
  createAsset: (
    accessToken: string,
    householdId: string,
    payload: CreateAssetPayload,
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'asset', action: 'create' }, 'asset.create',
      (intent, opts) => client.createAsset(accessToken, payload, { intent, ...opts }), options ?? {}),

  renameAsset: (
    accessToken: string,
    householdId: string,
    assetId: string,
    payload: { name: string; expected_updated_at: string },
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'asset', action: 'update', entityId: assetId }, 'asset.rename',
      (intent, opts) => client.updateAssetName(accessToken, assetId, payload, { intent, ...opts }), options ?? {}),

  updateIdentity: (
    accessToken: string,
    householdId: string,
    assetId: string,
    payload: client.UpdateAssetIdentityPayload,
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'asset', action: 'update', entityId: assetId }, 'asset.identity',
      (intent, opts) => client.updateAssetIdentity(accessToken, assetId, payload, { intent, ...opts }), options ?? {}),

  setCategory: (
    accessToken: string,
    householdId: string,
    assetId: string,
    payload: { category_id: string | null; expected_category_id: string | null },
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'asset', action: 'category', entityId: assetId }, 'asset.category',
      (intent, opts) => client.setAssetCategory(accessToken, assetId, payload, { intent, ...opts }), options ?? {}),

  createCategory: (
    accessToken: string,
    householdId: string,
    payload: { name: string },
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'category', action: 'create' }, 'category.create',
      (intent, opts) => client.createCategory(accessToken, payload, { intent, ...opts }), options ?? {}),

  setResponsible: (
    accessToken: string,
    householdId: string,
    assetId: string,
    payload: { responsible_member_id: string | null; expected_responsible_member_id: string | null },
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'asset', action: 'context', entityId: assetId }, 'asset.responsible',
      (intent, opts) => client.setAssetResponsible(accessToken, assetId, payload, { intent, ...opts }), options ?? {}),

  setHolder: (
    accessToken: string,
    householdId: string,
    assetId: string,
    payload: { holder: client.AssetHolderValue; expected_holder: client.AssetHolderValue },
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'asset', action: 'context', entityId: assetId }, 'asset.holder',
      (intent, opts) => client.setAssetHolder(accessToken, assetId, payload, { intent, ...opts }), options ?? {}),

  setPlacement: (
    accessToken: string,
    householdId: string,
    assetId: string,
    payload: { placement: client.AssetPlacementValue; expected_placement: client.AssetPlacementValue },
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'asset', action: 'context', entityId: assetId }, 'asset.placement',
      (intent, opts) => client.setAssetPlacement(accessToken, assetId, payload, { intent, ...opts }), options ?? {}),

  changeProfile: (
    accessToken: string,
    householdId: string,
    assetId: string,
    payload: { profile: 'STANDARD' | 'VEHICLE' | 'PET' | 'PROPERTY' },
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'asset', action: 'profile', entityId: assetId }, 'asset.profile',
      (intent, opts) => client.changeAssetProfile(accessToken, assetId, payload, { intent, ...opts }), options ?? {}),

  setLifecycleStatus: (
    accessToken: string,
    householdId: string,
    assetId: string,
    payload: { lifecycle_status: 'ACTIVE' | 'INACTIVE'; expected_lifecycle_status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'TRASH' },
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'asset', action: 'lifecycle', entityId: assetId }, 'asset.lifecycle',
      (intent, opts) => client.setAssetLifecycleStatus(accessToken, assetId, payload, { intent, ...opts }), options ?? {}),

  archive: (
    accessToken: string,
    householdId: string,
    assetId: string,
    payload: { expected_lifecycle_status: 'ACTIVE' | 'INACTIVE'; disposition?: string; disposition_note?: string },
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'asset', action: 'archive', entityId: assetId }, 'asset.archive',
      (intent, opts) => client.archiveAsset(accessToken, assetId, payload, { intent, ...opts }), options ?? {}),

  unarchive: (
    accessToken: string,
    householdId: string,
    assetId: string,
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'asset', action: 'lifecycle', entityId: assetId }, 'asset.unarchive',
      (intent, opts) => client.unarchiveAsset(accessToken, assetId, { intent, ...opts }), options ?? {}),

  trash: (
    accessToken: string,
    householdId: string,
    assetId: string,
    payload: { expected_lifecycle_status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' },
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'asset', action: 'trash_restore', entityId: assetId }, 'asset.trash',
      (intent, opts) => client.trashAsset(accessToken, assetId, payload, { intent, ...opts }), options ?? {}),

  restore: (
    accessToken: string,
    householdId: string,
    assetId: string,
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'asset', action: 'trash_restore', entityId: assetId }, 'asset.restore',
      (intent, opts) => client.restoreAsset(accessToken, assetId, { intent, ...opts }), options ?? {}),

  // ── Records ──

  createRecord: (
    accessToken: string,
    householdId: string,
    payload: client.CreateAssetRecordPayload,
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'record', action: 'create' }, 'record.create',
      (intent, opts) => client.createAssetRecord(accessToken, payload, { intent, ...opts }), options ?? {},
      { assetIds: payload.asset_ids }),

  linkRecord: (
    accessToken: string,
    householdId: string,
    recordId: string,
    payload: { asset_id: string },
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'record', action: 'link', entityId: recordId }, 'record.link',
      (intent, opts) => client.linkRecordToAsset(accessToken, recordId, payload, { intent, ...opts }), options ?? {},
      { assetIds: [payload.asset_id] }),

  unlinkRecord: (
    accessToken: string,
    householdId: string,
    recordId: string,
    payload: { asset_id: string },
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'record', action: 'link', entityId: recordId }, 'record.unlink',
      (intent, opts) => client.unlinkRecordFromAsset(accessToken, recordId, payload, { intent, ...opts }), options ?? {},
      { assetIds: [payload.asset_id] }),

  correctRecord: (
    accessToken: string,
    householdId: string,
    recordId: string,
    payload: Record<string, unknown>,
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'record', action: 'update', entityId: recordId }, 'record.correct',
      (intent, opts) => client.correctAssetRecord(accessToken, recordId, payload, { intent, ...opts }), options ?? {},
      { fromResponse: recordAssetIds }),

  correctRecordPeriod: (
    accessToken: string,
    householdId: string,
    recordId: string,
    periodId: string,
    payload: { valid_from?: string | null; valid_until?: string | null; expected_updated_at: string },
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'record', action: 'update', entityId: recordId }, 'record.period.correct',
      (intent, opts) => client.correctAssetRecordPeriod(accessToken, recordId, periodId, payload, { intent, ...opts }), options ?? {},
      { fromResponse: recordAssetIds }),

  renewRecord: (
    accessToken: string,
    householdId: string,
    recordId: string,
    payload: { valid_from?: string | null; valid_until?: string | null; asset_ids: string[] },
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'record', action: 'update', entityId: recordId }, 'record.renew',
      (intent, opts) => client.renewAssetRecord(accessToken, recordId, payload, { intent, ...opts }), options ?? {},
      { fromResponse: recordAssetIds }),

  removeRecord: (
    accessToken: string,
    householdId: string,
    recordId: string,
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'record', action: 'remove_restore', entityId: recordId }, 'record.remove',
      (intent, opts) => client.removeAssetRecord(accessToken, recordId, { intent, ...opts }), options ?? {},
      { fromResponse: recordAssetIds }),

  restoreRecord: (
    accessToken: string,
    householdId: string,
    recordId: string,
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'record', action: 'remove_restore', entityId: recordId }, 'record.restore',
      (intent, opts) => client.restoreAssetRecord(accessToken, recordId, { intent, ...opts }), options ?? {},
      { fromResponse: recordAssetIds }),

  // ── Care ──

  createCare: (
    accessToken: string,
    householdId: string,
    payload: client.CreateManualCarePayload,
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'care', action: 'create' }, 'care.create',
      (intent, opts) => client.createManualCare(accessToken, payload, { intent, ...opts }), options ?? {},
      { assetIds: [payload.asset_id] }),

  correctCare: (
    accessToken: string,
    householdId: string,
    careId: string,
    payload: Record<string, unknown> & { expected_updated_at: string },
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'care', action: 'update', entityId: careId }, 'care.correct',
      (intent, opts) => client.correctManualCare(accessToken, careId, payload, { intent, ...opts }), options ?? {},
      { fromResponse: careAssetIds }),

  removeCare: (
    accessToken: string,
    householdId: string,
    careId: string,
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'care', action: 'remove_restore', entityId: careId }, 'care.remove',
      (intent, opts) => client.removeManualCare(accessToken, careId, { intent, ...opts }), options ?? {},
      { fromResponse: careAssetIds }),

  restoreCare: (
    accessToken: string,
    householdId: string,
    careId: string,
    options?: MutationCallOptions,
  ) =>
    run(householdId, { kind: 'care', action: 'remove_restore', entityId: careId }, 'care.restore',
      (intent, opts) => client.restoreManualCare(accessToken, careId, { intent, ...opts }), options ?? {},
      { fromResponse: careAssetIds }),
} as const;

export type AssetsMutations = typeof mutations;
