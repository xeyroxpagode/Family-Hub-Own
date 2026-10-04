import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton, AppText } from '../../components/ui';
import { colors, radius, spacing } from '../../constants/theme';

export interface FileSelectionBarProps {
  /** How many Files are selected. The bar restates it so the target is never implicit. */
  count: number;
  /** The stated count, from the selection model, so the copy cannot drift from the state. */
  summary: string;
  canOrganize: boolean;
  busy: boolean;
  onMove: () => void;
  onCancel: () => void;
}

/**
 * HomeCloud Files — THE CONTEXTUAL SELECTION ACTION BAR.
 *
 * This is the ONE place a multi-File operation is offered: while selection mode
 * is active it states how many Files are selected and offers the bulk actions
 * that exist now. Bulk Move plugs into the same model later actions plug into,
 * so Lifecycle never needs a second selection surface.
 *
 * Bulk Trash is deliberately absent: there is no Lifecycle backend yet, and a row
 * that cannot work is not rendered.
 */
export function FileSelectionBar({
  count,
  summary,
  canOrganize,
  busy,
  onMove,
  onCancel,
}: FileSelectionBarProps) {
  const noun = count === 1 ? 'archivo seleccionado' : 'archivos seleccionados';
  return (
    <View style={styles.bar}>
      <AppText variant="bodySmall" weight="700" accessibilityLabel={summary}>{summary}</AppText>
      <View style={styles.actions}>
        <AppButton
          title="Mover"
          size="sm"
          variant="secondary"
          disabled={!canOrganize || busy || count === 0}
          onPress={onMove}
          accessibilityLabel={`Mover ${count} ${noun}`}
        />
        <AppButton
          title="Cancelar"
          size="sm"
          variant="ghost"
          onPress={onCancel}
          accessibilityLabel="Salir de la selección"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[3],
    gap: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    backgroundColor: colors.surface.card,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
});
