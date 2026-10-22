/**
 * HOMePLUS Assets — S8: one attached File row (shared by Asset/Record/Care).
 *
 * The row shows the LIVE HomeCloud metadata projected by the backend. It never
 * shows a cached copy of the File: the Assets relation stores only the
 * relation, and every read asks HomeCloud for the current truth.
 *
 * Lifecycle (frozen):
 *   available -> normal row, the viewer can be opened.
 *   trashed   -> badge "En la papelera", NO viewer.
 *   purging   -> badge "Se está eliminando", NO viewer.
 *   missing   -> "Archivo no disponible", NO metadata, NO viewer. The relation
 *                survives as a tombstone: nothing is auto-unlinked.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import { AppText } from '../ui/AppText';
import { InteractivePressable } from '../ui/InteractivePressable';
import type { AssetFileRelation, AssetFileState } from '../../services/assets/assetsFiles';

/** The frozen badges of the Assets file lifecycle. */
export const ASSET_FILE_STATE_BADGE: Record<
  AssetFileState,
  { readonly label: string; readonly tone: 'secondary' | 'warning' | 'danger' } | null
> = {
  available: null,
  trashed: { label: 'En la papelera', tone: 'warning' },
  purging: { label: 'Se está eliminando', tone: 'danger' },
  missing: null,
};

/** The frozen copy of a File that no longer exists. */
export const ASSET_FILE_MISSING_LABEL = 'Archivo no disponible';

/**
 * S9 — the label of the OWNER of a relation, for the aggregated list.
 *
 * It says where the File comes from. It NEVER implies that the ownership
 * changed: a Record file stays owned by its Record.
 */
export function assetFileOwnerLabel(relation: AssetFileRelation): string {
  if (relation.owner_type === 'asset') return 'Activo';
  if (relation.owner_type === 'record') return 'Registro';
  return 'Historial/Cuidado';
}

/**
 * S9 — the human label of the owner (its title or description).
 */
export function assetFileOwnerDetail(relation: AssetFileRelation): string | null {
  const context = relation.owner_context;
  if (!context) return null;
  if (context.type === 'record') {
    return context.record_label ?? context.record_title ?? null;
  }
  if (context.type === 'care') {
    return context.care_label ?? context.care_description ?? null;
  }
  return null;
}

/**
 * S9 — the owner lifecycle of the relation.
 *
 * A REMOVED Record or Care FREEZES its writes: its Files can be seen but
 * NOT detached.
 */
export function assetFileOwnerStatus(relation: AssetFileRelation): string | null {
  const context = relation.owner_context;
  if (!context) return null;
  if (context.type === 'record') return context.record_status ?? null;
  if (context.type === 'care') return context.care_status ?? null;
  return null;
}

/** True when the viewer may be opened for this state. */
export function assetFileStateAllowsViewer(state: AssetFileState): boolean {
  return state === 'available';
}

/** Human readable size, or null when the size is unknown. */
export function formatAssetFileSize(sizeBytes: number | null | undefined): string | null {
  if (typeof sizeBytes !== 'number' || !Number.isFinite(sizeBytes) || sizeBytes < 0) return null;
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = sizeBytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
}

export function AssetFileRow({
  relation,
  onPress,
  onUnlink,
  canUnlink = true,
  showOwner = false,
}: {
  relation: AssetFileRelation;
  /** Opens the real HomeCloud viewer (only for the `available` state). */
  onPress?: () => void;
  /** Detaches the File (the relation only). */
  onUnlink?: () => void;
  canUnlink?: boolean;
  /** S9: shows WHO owns the relation (the aggregated list). */
  showOwner?: boolean;
}) {
  const theme = useAppTheme();
  const { state, file } = relation;
  const badge = ASSET_FILE_STATE_BADGE[state];
  const canOpen = state === 'available' && typeof onPress === 'function';
  const title = state === 'missing' || !file ? ASSET_FILE_MISSING_LABEL : file.display_name ?? 'Archivo';
  const subtitle =
    state === 'missing' || !file
      ? null
      : [file.extension ? file.extension.toUpperCase() : null, formatAssetFileSize(file.size_bytes)]
          .filter(Boolean)
          .join(' · ');
  const ownerLabel = showOwner ? assetFileOwnerLabel(relation) : null;
  const ownerDetail = showOwner ? assetFileOwnerDetail(relation) : null;

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.colors.surface.soft,
          borderColor: theme.colors.border.default,
        },
      ]}
    >
      <InteractivePressable
        accessibilityRole="button"
        accessibilityLabel={
          canOpen ? `Abrir ${title}` : title
        }
        accessibilityState={{ disabled: !canOpen }}
        disabled={!canOpen}
        onPress={() => onPress?.()}
        haptic="light"
        pressScale={0.98}
        style={styles.main}
      >
        <HomePlusIcon
          name="document-text-outline"
          size={20}
          color={theme.colors.text.secondary}
        />
        <View style={styles.textBlock}>
          <AppText variant="body" weight="600" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" tone="secondary" numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
          {badge ? (
            <AppText variant="caption" tone={badge.tone} weight="600">
              {badge.label}
            </AppText>
          ) : null}
          {ownerLabel ? (
            <AppText variant="caption" tone="tertiary" numberOfLines={1}>
              {ownerLabel}
              {ownerDetail ? ` · ${ownerDetail}` : ''}
            </AppText>
          ) : null}
        </View>
      </InteractivePressable>
      {onUnlink && canUnlink ? (
        <InteractivePressable
          accessibilityRole="button"
          accessibilityLabel={`Quitar ${title}`}
          onPress={() => onUnlink()}
          haptic="light"
          pressScale={0.95}
          style={styles.action}
        >
          <HomePlusIcon name="close-circle-outline" size={22} color={theme.colors.text.secondary} />
        </InteractivePressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  action: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
});
