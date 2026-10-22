/**
 * HOMePLUS Assets — F0 Foundation. Query-key factory canónica.
 *
 * Patrón: services/planner/plannerKeys.ts.
 * - Toda key household-scoped incluye householdId explícito: dos households
 *   NUNCA comparten caché (cambio de Household no muestra datos ajenos).
 * - Filtros normalizados (sorted, sin undefined/null/'') → misma key.
 * - Keys: arrays readonly de primitivos.
 * - Único origen público de keys Assets: prohibidas las strings inline.
 */

import type { AssetListFilters } from './types';

export type AssetsHouseholdScope = {
  readonly householdId: string;
};

export type AssetsKeyKind =
  | 'assets'
  | 'categories'
  | 'records'
  | 'care'
  | 'history'
  | 'capabilities'
  | 'plannerItems'
  | 'files';

function normalizeFilters(filters?: AssetListFilters): readonly (string | number)[] {
  if (!filters) return ['*'];
  const entries = Object.entries(filters)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return ['*'];
  return entries.flatMap(([k, v]) => [k, String(v)]);
}

export function classifyAssetsKey(key: readonly unknown[]): AssetsKeyKind | null {
  if (key[0] !== 'assets') return null;
  const second = key[1];
  if (
    typeof second === 'string' &&
    ['assets', 'categories', 'records', 'care', 'history', 'capabilities', 'plannerItems', 'files'].includes(second)
  ) {
    return second as AssetsKeyKind;
  }
  return null;
}

export function assetsHouseholdOf(key: readonly unknown[]): string | null {
  if (key[0] !== 'assets') return null;
  return typeof key[2] === 'string' ? key[2] : null;
}

const root = (): readonly string[] => ['assets'] as const;

const all = (scope: AssetsHouseholdScope): readonly (string | number)[] =>
  ['assets', 'assets', scope.householdId, 'all'] as const;

const list = (
  scope: AssetsHouseholdScope,
  filters?: AssetListFilters,
): readonly (string | number)[] =>
  ['assets', 'assets', scope.householdId, 'list', ...normalizeFilters(filters)];

const detail = (
  scope: AssetsHouseholdScope,
  assetId: string,
): readonly (string | number)[] =>
  ['assets', 'assets', scope.householdId, 'detail', assetId];

const categories = (scope: AssetsHouseholdScope): readonly (string | number)[] =>
  ['assets', 'categories', scope.householdId];

const records = (
  scope: AssetsHouseholdScope,
  assetId: string,
  recordScope: 'active' | 'removed' = 'active',
): readonly (string | number)[] =>
  ['assets', 'records', scope.householdId, assetId, recordScope];

const care = (
  scope: AssetsHouseholdScope,
  assetId: string,
  careScope: 'active' | 'removed' = 'active',
): readonly (string | number)[] =>
  ['assets', 'care', scope.householdId, assetId, careScope];

const history = (
  scope: AssetsHouseholdScope,
  assetId: string,
  kind: 'archive' | 'trash',
): readonly (string | number)[] =>
  ['assets', 'history', scope.householdId, assetId, kind];

/** Proyección de capabilities del miembro activo en el Household activo. */
const capabilities = (scope: AssetsHouseholdScope): readonly (string | number)[] =>
  ['assets', 'capabilities', scope.householdId];

/**
 * S7 — read model "Próximo" del activo: Tasks/Events de Planner que lo
 * referencian. Household-scoped con el householdId en el índice 2 (misma
 * convención que el resto de las keys Assets).
 */
const plannerItems = (
  scope: AssetsHouseholdScope,
  assetId: string,
): readonly (string | number)[] =>
  ['assets', 'plannerItems', scope.householdId, assetId];

/**
 * S8 — Files attached to one Asset/Record/Care.
 *
 * Shape (frozen): ['assets', 'files', householdId, ownerType, ownerId].
 * The householdId stays at index 2, like every other Assets key, so a
 * household switch can never show another household's rows.
 *
 * The owner type is part of the key because the same id space is shared by
 * the three owner kinds.
 *
 * S9 — the last element is the AGGREGATION scope ('direct' | 'all'): the
 * direct list and the aggregated list of the same Asset are DIFFERENT read
 * models and must never share a cache entry.
 */
const files = (
  scope: AssetsHouseholdScope,
  ownerType: 'asset' | 'record' | 'care',
  ownerId: string,
  include: 'direct' | 'all' = 'direct',
): readonly (string | number)[] =>
  ['assets', 'files', scope.householdId, ownerType, ownerId, include];

export const assetsKeys = {
  root,
  all,
  list,
  detail,
  categories,
  records,
  care,
  history,
  capabilities,
  plannerItems,
  files,
} as const;
