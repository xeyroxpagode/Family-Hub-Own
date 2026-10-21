import React from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { colors, spacing } from '../../constants/theme';
import { HomePlusIcon } from '../../constants/icons';
import {
  memorySelectionActionsLabel,
  memorySelectionAddLabel,
  memorySelectionCountLabel,
  memorySelectionRemoveLabel,
} from '../../services/homecloud/homecloudMemorySelection';
import type { MemorySelectionFailure } from '../../services/homecloud/homecloudMemoryMutations';
import { AppButton } from '../ui/AppButton';
import { AppText } from '../ui/AppText';

/**
 * HomeCloud MO-A3 → HC2-C — the SELECTION HEADER.
 *
 * HC2-C FROZEN COMPOSITION:
 *
 *     [X]      N seleccionados      [Acciones ⋯]
 *
 * TWO THINGS THIS FILE NO LONGER CONTAINS, ON PURPOSE
 * ----------------------------------------------------
 *
 *  1. NO `SegmentedControl` (`Recuerdos | Colecciones`). That control is what
 *     made selection a navigation destination: choosing `Colecciones` swapped the
 *     entire screen body for a second parallel surface. Selection is contextual
 *     state inside the CURRENT surface, so the current surface is simply the one
 *     you are already looking at.
 *
 *  2. NO `✓` gate in front of the actions. The `✓` existed only to REVEAL the
 *     contextual actions, which made an obvious capability two taps away and
 *     implied a confirmation that was never asked for. The contextual action
 *     sheet is opened by `⋯` from the FIRST FRAME of the selection, and any real
 *     mutation it can perform still asks for whatever confirmation that mutation
 *     genuinely needs.
 *
 * WHAT IS STILL HERE
 * ------------------
 *  - `X` CANCELS. No mutation, and the surface is exactly the one it was.
 *  - the exact count is always visible.
 *  - the operation line names the operation honestly.
 *  - a partial mutation failure is an honest INLINE state with a retry of ONLY
 *    the failed ids, because the committed memberships stay committed and only
 *    the failures remain to be done. Nothing is ever rolled back, and the copy
 *    never uses `Eliminar` / `Borrar` / `Papelera`.
 */

export function MemorySelectionHeader({
  selectedCount,
  purpose,
  destinationName,
  canAddToAlbum,
  onCancel,
  onOpenActions,
  busy,
  failure,
  onRetryFailed,
}: {
  selectedCount: number;
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
  /** Opens the contextual action sheet. Available from the first frame. */
  onOpenActions: (event?: GestureResponderEvent) => void;
  busy: boolean;
  failure: MemorySelectionFailure | null;
  onRetryFailed: () => void;
}) {
  const actionsDisabled = selectedCount === 0 || busy;

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
          <AppText variant="bodySmall" weight="700">
            {memorySelectionCountLabel(selectedCount)}
          </AppText>
        </View>
        <AppButton
          variant="icon"
          size="sm"
          onPress={onOpenActions}
          disabled={actionsDisabled}
          accessibilityLabel={memorySelectionActionsLabel(selectedCount)}
        >
          <HomePlusIcon name="ellipsis-horizontal" size={21} color={colors.text.primary} />
        </AppButton>
      </View>

      <View style={styles.status}>
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
