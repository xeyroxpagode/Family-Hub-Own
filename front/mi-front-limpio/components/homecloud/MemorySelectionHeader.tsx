import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import {
  memorySelectionAddLabel,
  memorySelectionCountLabel,
  memorySelectionRemoveLabel,
} from '../../services/homecloud/homecloudMemorySelection';
import type { MemorySelectionFailure } from '../../services/homecloud/homecloudMemoryMutations';
import { AppButton } from '../ui/AppButton';
import { AppText } from '../ui/AppText';
import { SegmentedControl } from '../ui/SegmentedControl';

/**
 * HomeCloud MO-A3 — the SELECTION HEADER.
 *
 * The frozen composition is:
 *
 *     [X]        Recuerdos | Colecciones        [✓]
 *
 *     N seleccionados
 *     Agregar a Vacaciones            (or "Quitar N del álbum")
 *
 * Spacing adapts to the existing HomePlus grammar; the SEMANTICS do not move:
 *
 *  - `X` CANCELS. It performs no mutation and restores the exact origin (the
 *    Album it was opened from, the Timeline scroll offset).
 *  - `✓` CONFIRMS the current operation. With ZERO selected it is disabled.
 *  - `Recuerdos | Colecciones` switches which Memories are on screen. It never
 *    changes the pending selection, the operation, or the destination.
 *
 * OPERATION FAILURES LIVE HERE, NOT IN A TOAST
 * --------------------------------------------
 * A partial mutation failure is an honest INLINE state, because the successful
 * memberships stay committed and only the failed ids remain selected: a toast
 * would disappear and hide a retry that still has to happen. Nothing is ever
 * rolled back, and the copy never uses `Eliminar` / `Borrar` / `Papelera`.
 */

export type MemorySelectionSourceTab = 'library' | 'collections';

export function MemorySelectionHeader({
  selectedCount,
  tab,
  purpose,
  destinationName,
  canAddToAlbum,
  onCancel,
  onTabChange,
  onConfirm,
  busy,
  failure,
  onRetryFailed,
}: {
  selectedCount: number;
  tab: MemorySelectionSourceTab;
  /** null = generic (the destination is still to be chosen). */
  purpose: 'generic' | 'addToAlbum' | 'removeFromAlbum';
  /** The Album name of the destination operation, when there is one. */
  destinationName: string | null;
  /**
   * `homecloud.organize`. A generic selection without it does NOT advertise
   * "Agregar a álbum": the action could only fail, and a member who may not
   * organize is never offered an Album mutation.
   */
  canAddToAlbum: boolean;
  onCancel: () => void;
  onTabChange: (tab: MemorySelectionSourceTab) => void;
  onConfirm: () => void;
  busy: boolean;
  failure: MemorySelectionFailure | null;
  onRetryFailed: () => void;
}) {
  const confirmDisabled = selectedCount === 0 || busy;
  const confirmAccessibility = confirmDisabled && selectedCount === 0
    ? 'Confirmar, 0 seleccionados'
    : `Confirmar, ${selectedCount} ${selectedCount === 1 ? 'seleccionado' : 'seleccionados'}`;

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        <AppButton
          variant="icon"
          size="sm"
          onPress={onCancel}
          disabled={busy}
          accessibilityLabel="Cancelar la selección y volver"
        >
          <HomePlusIcon name="close" size={21} color={colors.text.primary} />
        </AppButton>
        <View style={styles.segment}>
          <SegmentedControl
            size="compact"
            value={tab}
            onChange={(next) => onTabChange(next as MemorySelectionSourceTab)}
            accessibilityLabel="Elegir entre recuerdos y colecciones"
            options={[
              {
                value: 'library',
                label: 'Recuerdos',
                accessibilityLabel: 'Ver los recuerdos de la biblioteca',
              },
              {
                value: 'collections',
                label: 'Colecciones',
                accessibilityLabel: 'Ver las colecciones: álbumes, fotos, videos, audios y notas',
              },
            ]}
          />
        </View>
        <AppButton
          variant="icon"
          size="sm"
          onPress={onConfirm}
          disabled={confirmDisabled}
          accessibilityLabel={confirmAccessibility}
        >
          <HomePlusIcon name="checkmark" size={21} color={colors.text.primary} />
        </AppButton>
      </View>

      <View style={styles.status}>
        <AppText variant="bodySmall" weight="700">
          {memorySelectionCountLabel(selectedCount)}
        </AppText>
        {purpose === 'removeFromAlbum' ? (
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
            {memorySelectionRemoveLabel(selectedCount)}
          </AppText>
        ) : purpose === 'addToAlbum' ? (
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
            {memorySelectionAddLabel(destinationName)}
          </AppText>
        ) : canAddToAlbum ? (
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
            {'Agregar a un álbum'}
          </AppText>
        ) : null}
      </View>

      {failure !== null ? (
        <View style={styles.failure}>
          <AppText variant="caption" tone="danger">
            {failure.summary}
          </AppText>
          {failure.failures.map((item) => (
            <AppText key={item.contentId} variant="caption" tone="secondary" numberOfLines={2}>
              {`• ${item.label}: ${item.message}`}
            </AppText>
          ))}
          {failure.failures.length > 0 ? (
            <AppButton
              title="Reintentar los que fallaron"
              size="sm"
              variant="secondary"
              disabled={busy}
              onPress={onRetryFailed}
              accessibilityLabel={`Reintentar ${failure.failures.length} recuerdos que no se pudieron modificar`}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    gap: spacing[2],
  },
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  segment: { flex: 1 },
  status: { gap: 2 },
  failure: {
    gap: spacing[1],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger.soft,
    backgroundColor: colors.danger.soft,
  },
});