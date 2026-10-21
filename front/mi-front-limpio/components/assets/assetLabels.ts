import type {
  AssetDto,
  AssetHolder,
  AssetPlacement,
  AssetResponsible,
  AssetLifecycleStatus,
} from '../../services/assets';

/**
 * Proyección humana canónica del contexto (Target §8, Personas y ubicación).
 * Frases naturales, en este orden de prioridad:
 *   1. Quién lo tiene (Holder).
 *   2. Dónde está (Placement).
 *   3. Responsable.
 *   4. Categoría.
 * Nunca se muestran todas simultáneamente y nunca tres "Sin especificar".
 */
export const describeHolder = (holder: AssetHolder): string | null => {
  if (!holder || holder.kind === 'none') return null;
  if (holder.kind === 'member') {
    const name = holder.display_name ?? 'un miembro del hogar';
    return `Lo tiene ${name}`;
  }
  const label = holder.label?.trim();
  return label ? `Lo tiene ${label}` : null;
};

export const describePlacement = (placement: AssetPlacement): string | null => {
  if (!placement || placement.kind === 'none') return null;
  if (placement.kind === 'text') {
    const text = placement.text?.trim();
    return text ? `Está en ${text}` : null;
  }
  const property = placement.property_name?.trim() || 'una propiedad';
  const detail = placement.detail?.trim();
  return detail ? `Está en ${property} · ${detail}` : `Está en ${property}`;
};

export const describeResponsible = (responsible: AssetResponsible): string | null => {
  if (!responsible) return null;
  const name = responsible.display_name ?? 'un miembro del hogar';
  return `A cargo de ${name}`;
};

export const describeContextLine = (asset: AssetDto): string | null => {
  return (
    describeHolder(asset.holder) ??
    describePlacement(asset.placement) ??
    describeResponsible(asset.responsible) ??
    (asset.category?.name ? asset.category.name : null)
  );
};

export type LifecyclePill = {
  label: string;
  tone: 'neutral' | 'warning' | 'danger';
} | null;

/** Pill sólo cuando informa algo: ACTIVE no lleva pill. */
export const lifecyclePill = (status: AssetLifecycleStatus): LifecyclePill => {
  switch (status) {
    case 'ACTIVE':
      return null;
    case 'INACTIVE':
      return { label: 'Inactivo', tone: 'neutral' };
    case 'ARCHIVED':
      return { label: 'Archivado', tone: 'warning' };
    case 'TRASH':
      return { label: 'En papelera', tone: 'danger' };
    default:
      return null;
  }
};

export const LIFECYCLE_LABEL: Record<AssetLifecycleStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  ARCHIVED: 'Archivado',
  TRASH: 'En papelera',
};

/** Identidad compacta del activo para filas y fichas (sin duplicar datos). */
export const describeIdentity = (asset: AssetDto): string | null => {
  const parts = [asset.brand?.trim(), asset.model?.trim()].filter(
    (part): part is string => Boolean(part),
  );
  if (parts.length > 0) return parts.join(' ');
  return asset.category?.name ?? null;
};
