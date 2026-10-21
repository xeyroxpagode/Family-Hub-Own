/**
 * HOMePLUS Assets — F0 Foundation. Host modal único (variantes A/B/C/D).
 *
 * NO duplica el sistema global: compone `ActionSheet` existente y le da
 * semántica Assets (Target §6):
 *   A Action — menú compacto según contenido.
 *   B Form — formulario + footer sticky (keyboardAware).
 *   C Detail — lectura con scroll y acciones secundarias.
 *   D Confirmation — consecuencias + cancelar/confirmar.
 *
 * Reglas transversales:
 * - Una sola capa modal dominante y un solo scrim (el de ActionSheet).
 * - X solicita cierre completo; Back interno lo maneja el contenido (F1+).
 * - Dirty (O38): `AssetDiscardConfirm` con Seguir editando / Descartar.
 * - Pending: el caller deshabilita cierre vía `closeDisabled`.
 * - Sin haptics al abrir/cerrar (Target §5). Sólo la confirmación
 *   destructiva emite haptic, una vez, al confirmar.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import { errorHaptic } from '../../utils/haptics';
import { ActionSheet } from '../ui/ActionSheet';
import { AppButton } from '../ui/AppButton';
import { AppText } from '../ui/AppText';
import { InteractivePressable } from '../ui/InteractivePressable';

// ── A · Action ─────────────────────────────────────────────────────────────────

export type AssetMenuOption = {
  key: string;
  label: string;
  description?: string;
  icon: React.ComponentProps<typeof HomePlusIcon>['name'];
  destructive?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onSelect: () => void;
};

export function AssetActionMenu({
  visible,
  title,
  subtitle,
  options,
  onRequestClose,
  closeDisabled = false,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: AssetMenuOption[];
  onRequestClose: () => void;
  closeDisabled?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <ActionSheet
      visible={visible}
      title={title}
      subtitle={subtitle}
      onRequestClose={onRequestClose}
      closeDisabled={closeDisabled}
      size="content"
    >
      <View style={{ gap: theme.spacing[2] }}>
        {options.map((option) => (
          <InteractivePressable
            key={option.key}
            accessibilityRole="button"
            accessibilityLabel={option.disabled && option.disabledReason ? `${option.label}. ${option.disabledReason}` : option.label}
            accessibilityState={{ disabled: option.disabled }}
            disabled={option.disabled}
            onPress={() => {
              onRequestClose();
              option.onSelect();
            }}
            haptic="none"
            pressScale={0.99}
            style={[
              styles.menuRow,
              {
                backgroundColor: theme.colors.surface.soft,
                borderColor: theme.colors.border.default,
                opacity: option.disabled ? 0.55 : 1,
              },
            ]}
          >
            <HomePlusIcon
              name={option.icon}
              size={20}
              color={option.destructive ? theme.colors.danger.base : theme.colors.text.secondary}
            />
            <View style={{ flex: 1 }}>
              <AppText
                variant="body"
                weight="600"
                style={{ color: option.destructive ? theme.colors.danger.base : theme.colors.text.primary }}
              >
                {option.label}
              </AppText>
              {option.description || option.disabledReason ? (
                <AppText variant="caption" tone="secondary">
                  {option.disabled && option.disabledReason ? option.disabledReason : option.description}
                </AppText>
              ) : null}
            </View>
          </InteractivePressable>
        ))}
      </View>
    </ActionSheet>
  );
}

// ── B · Form ───────────────────────────────────────────────────────────────────

export function AssetFormSheet({
  visible,
  title,
  subtitle,
  onRequestClose,
  closeDisabled = false,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onRequestClose: () => void;
  closeDisabled?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <ActionSheet
      visible={visible}
      title={title}
      subtitle={subtitle}
      onRequestClose={onRequestClose}
      closeDisabled={closeDisabled}
      size="scrollable-content"
      keyboardAware
      footer={footer}
    >
      {children}
    </ActionSheet>
  );
}

// ── C · Detail ─────────────────────────────────────────────────────────────────

export function AssetDetailSheet({
  visible,
  title,
  subtitle,
  onRequestClose,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onRequestClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <ActionSheet
      visible={visible}
      title={title}
      subtitle={subtitle}
      onRequestClose={onRequestClose}
      size="scrollable-content"
      footer={footer}
    >
      {children}
    </ActionSheet>
  );
}

// ── D · Confirmation ───────────────────────────────────────────────────────────

export function AssetConfirmSheet({
  visible,
  title,
  consequences,
  cancelLabel = 'Cancelar',
  confirmLabel,
  destructive = false,
  pending = false,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  consequences: string;
  cancelLabel?: string;
  confirmLabel: string;
  destructive?: boolean;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ActionSheet
      visible={visible}
      title={title}
      onRequestClose={onCancel}
      closeDisabled={pending}
      size="content"
      footer={
        <View style={styles.confirmFooter}>
          <AppButton
            variant="secondary"
            title={cancelLabel}
            onPress={onCancel}
            disabled={pending}
            accessibilityLabel={cancelLabel}
            style={{ flex: 1 }}
          />
          <AppButton
            variant={destructive ? 'danger' : 'primary'}
            title={confirmLabel}
            onPress={() => {
              if (destructive) void errorHaptic();
              onConfirm();
            }}
            loading={pending}
            accessibilityLabel={confirmLabel}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <AppText variant="body" tone="secondary">
        {consequences}
      </AppText>
    </ActionSheet>
  );
}

// ── O38 · Descartar cambios ────────────────────────────────────────────────────

export function AssetDiscardConfirm({
  visible,
  pending = false,
  onKeepEditing,
  onDiscard,
}: {
  visible: boolean;
  pending?: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
}) {
  return (
    <AssetConfirmSheet
      visible={visible}
      title="Descartar cambios"
      consequences="Tenés cambios sin guardar. Si salís ahora, se pierden."
      cancelLabel="Seguir editando"
      confirmLabel="Descartar cambios"
      pending={pending}
      onCancel={onKeepEditing}
      onConfirm={onDiscard}
    />
  );
}

const styles = StyleSheet.create({
  menuRow: {
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  confirmFooter: {
    flexDirection: 'row',
    gap: 10,
  },
});
