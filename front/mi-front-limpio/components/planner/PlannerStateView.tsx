/**
 * Planner V1 — M2 PlannerStateView.
 *
 * Purpose (frozen by `planner_v1_implementation_order.md` §M2):
 * - Reusable component rendering the Planner shell state chrome for every
 *   `PlannerShellState.kind` that requires a full-screen chrome.
 *   (`refreshing` and `partial`/`offline_stale`/`ready` do NOT require chrome
 *   and are handled by the Shell body — those flow through other surfaces in
 *   `PlannerScreen`.)
 * - Uses design tokens exclusively; no emojis; consistent iconography.
 * - Short title, clear description, at most one primary action, an optional
 *   secondary action only when it carries real value.
 * - Accessible: roles, labels, name buttons, sufficient contrast (via tokens),
 *   large-font friendly spacing; live region informs state transitions.
 * - No nested cards, no decorative badges, no technical message as the
 *   primary copy; the request id is shown only as secondary support.
 *
 * The component is purely presentational; it never fires requests, navigation,
 * or side effects. The caller contracts the retry/refresh/exit/open-settings
 * callbacks and decides what is safe to expose for the current state.
 */

import React, { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { APP_ICONS, HomePlusIcon, type HomePlusIconName } from '../../constants/icons';
import { AppButton } from '../ui/AppButton';
import { AppText } from '../ui/AppText';
import { Skeleton } from '../ui/Skeleton';
import type {
  PlannerShellState,
  PlannerShellErrorInfo,
} from '../../services/planner/plannerShellState';

// ---------------------------------------------------------------------------
// 1. Props
// ---------------------------------------------------------------------------

export type PlannerStateViewProps = {
  state: PlannerShellState;
  onRetry?: () => void;
  onRefresh?: () => void;
  onGoBack?: () => void;
  onOpenSettings?: () => void;
  style?: StyleProp<ViewStyle>;
  /**
   * Optional override of the secondary action label for recoverable-error
   * scenarios. When omitted, the default copy is used.
   */
  secondaryActionLabel?: string;
  /**
   * Optional override of the primary action label. When omitted a per-state
   * default is used.
   */
  primaryActionLabel?: string;
};

// ---------------------------------------------------------------------------
// 2. State chrome descriptors (single source of per-state copy)
// ---------------------------------------------------------------------------

type ChromeDescriptor = {
  readonly icon: HomePlusIconName;
  readonly iconColor: string;
  readonly iconBgColor: string;
  readonly title: string;
  readonly description: string;
  readonly primaryLabel: string;
  readonly secondaryLabel?: string;
};

function describe(state: PlannerShellState): ChromeDescriptor {
  switch (state.kind) {
    case 'initial_loading':
      return {
        icon: 'time',
        iconColor: colors.text.tertiary,
        iconBgColor: colors.background.soft,
        title: 'Cargando Planner',
        description: 'Estamos preparando tus tareas, eventos y planes.',
        primaryLabel: 'Reintentar',
      };
    case 'empty':
      return {
        icon: APP_ICONS.planner.todo ?? 'checkbox',
        iconColor: colors.terracotta[500],
        iconBgColor: colors.sand[50],
        title: 'Planner está vacío',
        description: 'Cuando crees tareas, eventos o planes los vas a ver aquí.',
        primaryLabel: 'Volver',
      };
    case 'partial': {
      const sections = state.unavailableSections
        .map((key) => sectionLabel(key))
        .join(', ');
      return {
        icon: 'alert-circle',
        iconColor: colors.warning.strong,
        iconBgColor: colors.warning.soft,
        title: 'No pudimos cargar todo',
        description:
          sections.length > 0
            ? `Hay contenido disponible. Sección no disponible: ${sections}.`
            : 'Hay contenido disponible y no todo pudo cargarse.',
        primaryLabel: 'Reintentar',
      };
    }
    case 'offline_stale':
      return {
        icon: 'cloud-offline',
        iconColor: colors.warning.strong,
        iconBgColor: colors.warning.soft,
        title: 'Sin conexión',
        description: 'Estás viendo contenido guardado. Puede estar desactualizado.',
        primaryLabel: 'Reintentar',
      };
    case 'offline_empty':
      return {
        icon: 'cloud-offline',
        iconColor: colors.warning.strong,
        iconBgColor: colors.warning.soft,
        title: 'Sin conexión',
        description: 'Necesitamos conexión para cargar Planner. Reintentá cuando vuelva.',
        primaryLabel: 'Reintentar',
      };
    case 'forbidden':
      return {
        icon: 'lock-closed',
        iconColor: colors.danger.text,
        iconBgColor: colors.danger.soft,
        title: 'Sin acceso a Planner',
        description: 'No tenés permiso para ver Planner en este hogar.',
        primaryLabel: 'Salir',
        secondaryLabel: 'Ajustes',
      };
    case 'not_found':
      return {
        icon: 'compass',
        iconColor: colors.text.tertiary,
        iconBgColor: colors.background.soft,
        title: 'No encontramos este hogar',
        description: 'El hogar seleccionado no está disponible. Volvé al inicio.',
        primaryLabel: 'Volver',
      };
    case 'conflict':
      return {
        icon: 'sync',
        iconColor: colors.warning.strong,
        iconBgColor: colors.warning.soft,
        title: 'Los datos cambiaron',
        description: 'Otro dispositivo actualizó esta información. Recargá para ver lo último.',
        primaryLabel: 'Recargar',
      };
    case 'recoverable_error': {
      const info = state.error as PlannerShellErrorInfo | undefined;
      return {
        icon: 'warning',
        iconColor: colors.danger.text,
        iconBgColor: colors.danger.soft,
        title: recoverableErrorTitle(info),
        description: recoverableErrorDescription(info),
        primaryLabel: info?.isRetryable ? 'Reintentar' : 'Volver',
      };
    }
    case 'fatal_error':
      return {
        icon: APP_ICONS.planner.notes ?? 'warning',
        iconColor: colors.danger.text,
        iconBgColor: colors.danger.soft,
        title: 'Planner no está disponible',
        description: 'Algo falló al cargar Planner. Podés reintentar o salir.',
        primaryLabel: 'Reintentar',
        secondaryLabel: 'Salir',
      };
    case 'refreshing':
    case 'ready':
      return {
        icon: 'time',
        iconColor: colors.text.tertiary,
        iconBgColor: colors.background.soft,
        title: 'Planner',
        description: 'Listo.',
        primaryLabel: 'Reintentar',
      };
    default:
      return {
        icon: 'warning',
        iconColor: colors.danger.text,
        iconBgColor: colors.danger.soft,
        title: 'Planner no está disponible',
        description: 'Revisá tu conexión o intentá de nuevo.',
        primaryLabel: 'Reintentar',
      };
  }
}

function recoverableErrorTitle(info: PlannerShellErrorInfo | undefined): string {
  switch (info?.errorClass) {
    case 'timeout':
      return 'La conexión tardó demasiado';
    case 'server':
      return 'El servidor no responde';
    case 'offline':
      return 'Sin conexión';
    case 'validation':
      return 'No se pudo cargar Planner';
    default:
      return 'No pudimos cargar Planner';
  }
}

function recoverableErrorDescription(info: PlannerShellErrorInfo | undefined): string {
  switch (info?.errorClass) {
    case 'timeout':
      return 'La respuesta tardó más de lo esperado. Intentá de nuevo.';
    case 'server':
      return 'Tuvo un problema momentáneo. Intentá de nuevo en unos segundos.';
    case 'offline':
      return 'Necesitamos conexión para cargar Planner. Reintentá cuando vuelva.';
    case 'validation':
      return 'No se pudo procesar la información de Planner. Intentá de nuevo.';
    default:
      return 'Revisá tu conexión o intentá de nuevo.';
  }
}

function sectionLabel(key: 'tasks' | 'events' | 'plans'): string {
  switch (key) {
    case 'tasks':
      return 'Tareas';
    case 'events':
      return 'Eventos';
    case 'plans':
      return 'Planes';
    default:
      return String(key);
  }
}

// ---------------------------------------------------------------------------
// 3. Component
// ---------------------------------------------------------------------------

export function PlannerStateView({
  state,
  onRetry,
  onRefresh,
  onGoBack,
  onOpenSettings,
  style,
  primaryActionLabel,
  secondaryActionLabel,
}: PlannerStateViewProps) {
  const descriptor = useMemo(() => describe(state), [state]);

  // Primary action: per-state default but allow caller overrides.
  // We intentionally pick the SAFEST primary for each state; e.g. forbidden
  // uses "Salir" only when `onGoBack` is provided, otherwise the primary
  // becomes "Ajustes" when `onOpenSettings` is provided, and renders nothing
  // when neither callback is supplied (no empty action).
  const primary = useMemo(() => {
    const label = resolvePrimaryLabel(state, descriptor.primaryLabel, primaryActionLabel);
    const onPress = resolvePrimaryAction(
      state,
      onRetry,
      onRefresh,
      onGoBack,
      onOpenSettings,
    );
    return label && onPress ? { label, onPress } : null;
  }, [state, descriptor.primaryLabel, primaryActionLabel, onRetry, onRefresh, onGoBack, onOpenSettings]);

  const secondary = useMemo(() => {
    const label = secondaryActionLabel ?? descriptor.secondaryLabel;
    const onPress = resolveSecondaryAction(state, onRetry, onRefresh, onGoBack, onOpenSettings);
    return label && onPress ? { label, onPress } : null;
  }, [descriptor.secondaryLabel, secondaryActionLabel, state, onRetry, onRefresh, onGoBack, onOpenSettings]);

  if (state.kind === 'initial_loading') {
    return (
      <View style={[{ flex: 1, padding: spacing[5], gap: spacing[4] }, style]}>
        <Skeleton variant="screenSection" />
      </View>
    );
  }

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      importantForAccessibility="auto"
      style={[
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing[6],
          gap: spacing[4],
          backgroundColor: colors.background.base,
        },
        style,
      ]}
    >
      <View
        style={{
          minHeight: 72,
          minWidth: 72,
          borderRadius: radius.xxl,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: descriptor.iconBgColor,
        }}
      >
        <HomePlusIcon name={descriptor.icon} size={28} color={descriptor.iconColor} />
      </View>
      <View style={{ gap: spacing[2], alignItems: 'center' }}>
        <AppText variant="title3" align="center" tone="primary">
          {descriptor.title}
        </AppText>
        <AppText variant="bodySmall" align="center" tone="secondary">
          {descriptor.description}
        </AppText>
        {state.kind === 'recoverable_error' && state.error.requestId ? (
          <AppText variant="caption" align="center" tone="tertiary">
            Referencia {state.error.requestId}
          </AppText>
        ) : null}
        {state.kind === 'fatal_error' ? (
          <AppText variant="caption" align="center" tone="tertiary">
            Incidente {state.errorId}
          </AppText>
        ) : null}
      </View>
      <View style={{ gap: spacing[2], alignItems: 'stretch', minWidth: 220 }}>
        {primary ? (
          <AppButton
            title={primary.label}
            variant="primary"
            onPress={primary.onPress}
            accessibilityLabel={primary.label}
          />
        ) : null}
        {secondary ? (
          <AppButton
            title={secondary.label}
            variant="ghost"
            onPress={secondary.onPress}
            accessibilityLabel={secondary.label}
          />
        ) : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 4. Action resolution helpers
// ---------------------------------------------------------------------------

function resolvePrimaryLabel(
  state: PlannerShellState,
  defaultLabel: string,
  override?: string,
): string | null {
  if (override) return override;
  if (state.kind === 'forbidden') {
    return null;
  }
  if (state.kind === 'conflict') {
    return 'Recargar';
  }
  if (state.kind === 'not_found' || state.kind === 'empty') {
    return 'Volver';
  }
  return defaultLabel;
}

function resolvePrimaryAction(
  state: PlannerShellState,
  onRetry?: () => void,
  onRefresh?: () => void,
  onGoBack?: () => void,
  onOpenSettings?: () => void,
): (() => void) | undefined {
  switch (state.kind) {
    case 'initial_loading':
      return onRetry;
    case 'forbidden':
      return onGoBack ?? onOpenSettings;
    case 'not_found':
    case 'empty':
      return onGoBack;
    case 'conflict':
      return onRefresh ?? onRetry;
    case 'recoverable_error': {
      const info = state.error as PlannerShellErrorInfo | undefined;
      return info?.isRetryable ? onRetry : onGoBack;
    }
    case 'fatal_error':
      return onRetry;
    case 'offline_stale':
    case 'offline_empty':
      return onRetry;
    case 'partial':
      return onRetry;
    case 'refreshing':
    case 'ready':
      return undefined;
    default:
      return onRetry;
  }
}

function resolveSecondaryAction(
  state: PlannerShellState,
  onRetry?: () => void,
  onRefresh?: () => void,
  onGoBack?: () => void,
  onOpenSettings?: () => void,
): (() => void) | undefined {
  switch (state.kind) {
    case 'forbidden':
      return onOpenSettings;
    case 'fatal_error':
      return onGoBack ?? onOpenSettings;
    case 'offline_stale':
      return onOpenSettings;
    default:
      return undefined;
  }
}
