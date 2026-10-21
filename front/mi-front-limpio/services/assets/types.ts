/**
 * HOMePLUS Assets — F0 Foundation. DTOs canónicos del frontend.
 *
 * Fuente de verdad: `backend/src/services/assets.service.js` (mapAssetRowToDto,
 * loadRecordDtos, loadCareDtos, categorías). Estos tipos describen lo que el
 * backend EFECTIVAMENTE devuelve; no inventan campos.
 *
 * Reglas:
 * - Household isolation: todo DTO trae household_id del contexto autenticado.
 * - Sin fixtures: estos tipos nunca se instancian con datos simulados.
 * - Campos desconocidos del servidor se toleran (decodificación defensiva en
 *   client.ts), nunca se exigen.
 */

export type AssetProfile = 'STANDARD' | 'VEHICLE' | 'PET' | 'PROPERTY';

export type AssetLifecycleStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'TRASH';

/** Scope de listado (backend LIST_SCOPES). */
export type AssetListScope = 'normal' | 'archived' | 'trash';

export type AssetRecordScope = 'active' | 'removed';

export type CareListScope = 'active' | 'removed';

export type AssetsCapability = 'assets.view' | 'assets.contribute' | 'assets.manage';

export type AssetsCapabilityProjection = Record<AssetsCapability, boolean>;

export type AssetArchiveDisposition =
  | 'SOLD'
  | 'GIFTED'
  | 'DISPOSED'
  | 'LOST'
  | 'STOLEN'
  | 'REPLACED'
  | 'DECEASED'
  | 'OTHER';

export type AssetCategory = {
  id: string | null;
  name: string;
  kind: 'system' | 'custom' | string;
  asset_count: number;
  created_at: string;
};

export type AssetContextMember = {
  member_id: string | null;
  display_name: string | null;
  valid: boolean;
} | null;

export type AssetResponsible = AssetContextMember;

export type AssetHolder =
  | { kind: 'member'; member_id: string; display_name: string | null; valid: boolean }
  | { kind: 'external'; label: string }
  | { kind: 'none' }
  | null;

export type AssetPlacement =
  | {
      kind: 'property';
      property_asset_id: string;
      property_name: string | null;
      detail: string | null;
    }
  | { kind: 'text'; text: string }
  | { kind: 'none' }
  | null;

export type AssetDto = {
  id: string;
  household_id: string;
  name: string;
  profile: AssetProfile;
  lifecycle_status: AssetLifecycleStatus;
  archived_from: AssetLifecycleStatus | null;
  archived_at: string | null;
  archive: {
    disposition: AssetArchiveDisposition | string | null;
    note: string | null;
  } | null;
  trashed_from: AssetLifecycleStatus | null;
  trashed_at: string | null;
  trash: {
    trashed_from: AssetLifecycleStatus | null;
    trashed_at: string | null;
  } | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  identifiers: Record<string, string>;
  category: AssetCategory | null;
  created_at: string;
  updated_at: string;
  responsible: AssetResponsible;
  holder: AssetHolder;
  placement: AssetPlacement;
};

export type AssetListResponse = {
  scope: AssetListScope;
  assets: AssetDto[];
  nextOffset: number | null;
};

export type AssetListFilters = {
  scope?: AssetListScope;
  profile?: AssetProfile;
  category_id?: string;
  /** Búsqueda server-side. Backend actual: nombre únicamente (BG-01). */
  q?: string;
  limit?: number;
  offset?: number;
};

export type CreateAssetPayload = {
  name: string;
  profile: AssetProfile;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  identifiers?: Record<string, string>;
  category_id?: string | null;
};

export type AssetRecordPeriod = {
  id: string;
  record_id: string;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
};

export type AssetRecordLink = {
  id: string;
  record_id: string;
  period_id: string;
  asset_id: string;
  asset_name: string | null;
  asset_lifecycle_status: AssetLifecycleStatus | null;
  linked_at: string;
};

export type AssetRecordDto = {
  id: string;
  household_id: string;
  type: string;
  title: string;
  issuer: string | null;
  identifier: string | null;
  notes: string | null;
  status: 'ACTIVE' | 'REMOVED' | string;
  created_at: string;
  updated_at: string;
  periods: AssetRecordPeriod[];
  assets: AssetRecordLink[];
};

export type CareDatePrecision = 'exact' | 'month_year' | 'year' | 'unknown';

export type ManualCareDto = {
  id: string;
  household_id: string;
  asset_id: string;
  asset_name: string | null;
  asset_lifecycle_status: AssetLifecycleStatus | null;
  description: string;
  date_precision: CareDatePrecision;
  occurred_on: string | null;
  occurred_year: number | null;
  occurred_month: number | null;
  provider: string | null;
  notes: string | null;
  origin: 'MANUAL' | 'DERIVED_PLANNER' | string;
  status: 'ACTIVE' | 'REMOVED' | string;
  created_at: string;
  updated_at: string;
};

export const ASSET_PROFILES: readonly AssetProfile[] = Object.freeze([
  'STANDARD',
  'VEHICLE',
  'PET',
  'PROPERTY',
]);

export const ASSET_LIST_SCOPES: readonly AssetListScope[] = Object.freeze([
  'normal',
  'archived',
  'trash',
]);

/** Labels de filtro Root (Target §1.1). "Todos" = sin filtro de profile. */
export const ASSET_PROFILE_FILTERS = Object.freeze([
  { key: 'ALL', label: 'Todos' },
  { key: 'STANDARD', label: 'Objetos' },
  { key: 'VEHICLE', label: 'Vehículos' },
  { key: 'PET', label: 'Mascotas' },
  { key: 'PROPERTY', label: 'Propiedades' },
] as const);

export type AssetProfileFilterKey = (typeof ASSET_PROFILE_FILTERS)[number]['key'];

export const isAssetProfile = (value: unknown): value is AssetProfile =>
  typeof value === 'string' && (ASSET_PROFILES as readonly string[]).includes(value);

// ── O35 Lifecycle History ────────────────────────────────────────────────────

export type AssetArchiveEpisodeDto = {
  id: string;
  episode_number: number;
  from_lifecycle: AssetLifecycleStatus;
  disposition: string | null;
  disposition_note: string | null;
  last_context: {
    responsible: { member_id: string | null; display_name: string | null } | null;
    holder:
      | { type: 'member'; member_id: string; display_name: string | null }
      | { type: 'external'; external_label: string }
      | null;
    placement:
      | { type: 'property'; property_asset_id: string; property_name: string | null; detail: string | null }
      | { type: 'external'; external_text: string }
      | null;
  };
  archived_at: string;
  archived_by_member_id: string | null;
  unarchived_at: string | null;
  unarchived_to: AssetLifecycleStatus | null;
  created_at: string;
};

export type AssetTrashEpisodeDto = {
  id: string;
  episode_number: number;
  from_lifecycle: AssetLifecycleStatus;
  trashed_at: string;
  trashed_by_member_id: string | null;
  restored_at: string | null;
  restored_to: AssetLifecycleStatus | null;
  created_at: string;
};

export type LifecycleHistoryKind = 'archive' | 'trash';

export type LifecycleHistoryEpisode = {
  id: string;
  kind: LifecycleHistoryKind;
  action: 'ARCHIVED' | 'UNARCHIVED' | 'TRASHED' | 'RESTORED';
  timestamp: string;
  from_lifecycle: AssetLifecycleStatus;
  to_lifecycle: AssetLifecycleStatus | null;
  disposition: string | null;
  note: string | null;
  episode_number: number;
  last_context: AssetArchiveEpisodeDto['last_context'] | null;
};
