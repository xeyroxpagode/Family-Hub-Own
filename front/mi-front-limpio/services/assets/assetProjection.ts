/**
 * HOMePLUS Assets — proyección DTO (frontera de transporte).
 *
 * El backend es la autoridad y proyecta el contexto con `type`:
 *   responsible: { member_id, display_name, member_status, valid } | null
 *   holder:      { type: 'member',    member_id, display_name, valid }
 *              | { type: 'external', external_label }
 *   placement:   { type: 'property',  property_asset_id, property_name, detail }
 *              | { type: 'external', external_text }
 *
 * La UI usa una forma canónica propia (`kind`, `label`, `text`). Esta
 * traducción vive AQUÍ, en un módulo puro sin dependencias de runtime, para
 * que ningún componente vea la forma cruda del servidor y para que el
 * contrato sea verificable de forma determinista.
 */

import type {
  AssetDto,
  AssetHolder,
  AssetLifecycleStatus,
  AssetPlacement,
  AssetProfile,
  AssetResponsible,
} from './types';
import { isAssetProfile } from './types';

export type AssetHolderValue = { member_id: string } | { external_label: string } | null;

export type AssetPlacementValue =
  | { property_asset_id: string; detail?: string | null }
  | { external_text: string }
  | null;

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asNullableString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

export const normalizeResponsible = (raw: unknown): AssetResponsible => {
  if (raw === null || raw === undefined) return null;
  const r = asRecord(raw);
  const memberId = typeof r.member_id === 'string' ? r.member_id : null;
  if (!memberId) return null;
  return {
    member_id: memberId,
    display_name: asNullableString(r.display_name),
    valid: r.valid !== false,
  };
};

export const normalizeHolder = (raw: unknown): AssetHolder => {
  if (raw === null || raw === undefined) return null;
  const r = asRecord(raw);
  const type = String(r.type ?? r.kind ?? '');
  if (type === 'member') {
    return {
      kind: 'member',
      member_id: String(r.member_id ?? ''),
      display_name: asNullableString(r.display_name),
      valid: r.valid !== false,
    };
  }
  if (type === 'external') {
    return { kind: 'external', label: String(r.external_label ?? r.label ?? '') };
  }
  return null;
};

export const normalizePlacement = (raw: unknown): AssetPlacement => {
  if (raw === null || raw === undefined) return null;
  const r = asRecord(raw);
  const type = String(r.type ?? r.kind ?? '');
  if (type === 'property') {
    return {
      kind: 'property',
      property_asset_id: String(r.property_asset_id ?? ''),
      property_name: asNullableString(r.property_name),
      detail: asNullableString(r.detail),
    };
  }
  if (type === 'external' || type === 'text') {
    return { kind: 'text', text: String(r.external_text ?? r.text ?? '') };
  }
  return null;
};

export const normalizeAsset = (raw: unknown): AssetDto => {
  const r = asRecord(raw);
  const identifiers = asRecord(r.identifiers);
  const profile: AssetProfile = isAssetProfile(r.profile) ? r.profile : 'STANDARD';
  return {
    id: String(r.id ?? ''),
    household_id: String(r.household_id ?? ''),
    name: String(r.name ?? ''),
    profile,
    lifecycle_status: (r.lifecycle_status as AssetLifecycleStatus) ?? 'ACTIVE',
    archived_from: (r.archived_from as AssetLifecycleStatus | null) ?? null,
    archived_at: (r.archived_at as string | null) ?? null,
    archive: (r.archive as AssetDto['archive']) ?? null,
    trashed_from: (r.trashed_from as AssetLifecycleStatus | null) ?? null,
    trashed_at: (r.trashed_at as string | null) ?? null,
    trash: (r.trash as AssetDto['trash']) ?? null,
    brand: (r.brand as string | null) ?? null,
    model: (r.model as string | null) ?? null,
    serial_number: (r.serial_number as string | null) ?? null,
    identifiers: Object.fromEntries(
      Object.entries(identifiers).filter(([, v]) => typeof v === 'string'),
    ) as Record<string, string>,
    category: (r.category as AssetDto['category']) ?? null,
    created_at: String(r.created_at ?? ''),
    updated_at: String(r.updated_at ?? ''),
    responsible: normalizeResponsible(r.responsible),
    holder: normalizeHolder(r.holder),
    placement: normalizePlacement(r.placement),
  };
};

/** Proyección DTO actual → body esperado por el backend (una sola fuente). */
export const holderValueOf = (holder: AssetDto['holder']): AssetHolderValue => {
  if (!holder) return null;
  if (holder.kind === 'member') return { member_id: holder.member_id };
  if (holder.kind === 'external') return { external_label: holder.label };
  return null;
};

export const placementValueOf = (placement: AssetDto['placement']): AssetPlacementValue => {
  if (!placement) return null;
  if (placement.kind === 'property') {
    return { property_asset_id: placement.property_asset_id, detail: placement.detail };
  }
  if (placement.kind === 'text') return { external_text: placement.text };
  return null;
};
