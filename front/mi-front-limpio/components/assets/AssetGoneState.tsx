import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '../ui/AppText';
import { AppButton } from '../ui/AppButton';
import { useAppTheme } from '../../context/AppThemeContext';

export type AssetGoneStateProps = {
  /** CTA primaria: volver a la lista de activos. */
  onBack: () => void;
  /** Contexto opcional para mensaje más específico (sin disclosure de UUID ni códigos). */
  context?: 'detail' | 'records' | 'care';
};

/**
 * O39 — Gone / No disponible. Surface reusable para 404 definitivo.
 *
 * Contrato congelado:
 * - CASO A (asset inexistente): 404 → "Activo no encontrado" + "Volver a Activos".
 * - CASO B (cross-household): indistinguible de A. Sin disclosure.
 * - CASO C (TRASH): NO es Gone. El caller debe mostrar Detail normal.
 * - CASO D (stale navigation): mismo Gone de A.
 *
 * Nunca muestra: UUID, backend error code, stack, "forbidden", spinner infinito.
 */
export function AssetGoneState({ onBack, context }: AssetGoneStateProps) {
  const theme = useAppTheme();

  const title = context === 'records'
    ? 'Información no encontrada'
    : context === 'care'
      ? 'Historial no encontrado'
      : 'Activo no encontrado';

  const description = context === 'records'
    ? 'Puede haberse borrado o el enlace ya no es válido.'
    : context === 'care'
      ? 'Puede haberse borrado o el enlace ya no es válido.'
      : 'Puede haberse borrado o el enlace ya no es válido.';

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.border.default },
      ]}
    >
      <AppText variant="title3" weight="700" style={{ color: theme.colors.text.primary }}>
        {title}
      </AppText>
      <AppText variant="bodySmall" tone="secondary" style={{ color: theme.colors.text.secondary }}>
        {description}
      </AppText>
      <AppButton
        variant="secondary"
        title="Volver a Activos"
        onPress={onBack}
        style={{ alignSelf: 'flex-start', marginTop: theme.spacing[4] }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
});
