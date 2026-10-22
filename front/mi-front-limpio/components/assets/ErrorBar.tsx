import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppText } from '../ui/AppText';
import { AppButton } from '../ui/AppButton';
import { useAppTheme } from '../../context/AppThemeContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { assetsMotion } from '../../services/assets/motion';
import type { AssetsFailure } from '../../services/assets/errors';

export type ErrorBarKind = 'error' | 'warning' | 'info';

export type ErrorBarAction = {
  label: string;
  onPress: () => void;
};

export type ErrorBarProps = {
  visible: boolean;
  message: string;
  kind?: ErrorBarKind;
  action?: ErrorBarAction;
  dismissible?: boolean;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * S5-B — ErrorBar: primitive compacto de error contextual para formularios
 * y secciones. NO sustituye ErrorState (que es para estados de pantalla
 * completa) ni O39 Gone (que es para 404 definitivo).
 *
 * Contrato:
 * - 400 validation: mensaje humano, sin retry global; field error si existe dato.
 * - 403 permission: copy existente, sin retry infinito.
 * - 409 stale: informa cambio, conserva draft, acción recargar/reconciliar.
 * - 409 dependency: explica bloqueo concreto.
 * - 5xx/network: mensaje contextual, retry permitido.
 *
 * Motion: fade+translateY breve (170ms). Reduced motion: sin traslación.
 * A11Y: role="alert" para error, role="status" para info/warning. Anuncia el
 * mensaje vía AccessibilityInfo.announceForAccessibility.
 */
export function ErrorBar({
  visible,
  message,
  kind = 'error',
  action,
  dismissible = false,
  onDismiss,
  style,
  testID,
}: ErrorBarProps) {
  const theme = useAppTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(assetsMotion.errorY)).current;
  const announcedMessage = useRef<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (reduceMotion) {
        opacity.setValue(1);
        translateY.setValue(0);
      } else {
        opacity.setValue(0);
        translateY.setValue(assetsMotion.errorY);
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: assetsMotion.errorBar,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: assetsMotion.errorBar,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }
      if (announcedMessage.current !== message) {
        announcedMessage.current = message;
        AccessibilityInfo.announceForAccessibility(message);
      }
    } else {
      opacity.setValue(0);
      translateY.setValue(assetsMotion.errorY);
    }
  }, [visible, message, reduceMotion, opacity, translateY]);

  if (!visible) return null;

  const liveRegion = kind === 'error' ? 'assertive' : 'polite';
  const toneColor =
    kind === 'error'
      ? theme.colors.danger.base
      : kind === 'warning'
        ? theme.colors.warning.base
        : theme.colors.info.base;
  const bgColor =
    kind === 'error'
      ? theme.colors.danger.soft
      : kind === 'warning'
        ? theme.colors.warning.soft
        : theme.colors.info.soft;

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion={liveRegion}
      testID={testID}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[2],
          paddingHorizontal: theme.spacing[3],
          paddingVertical: theme.spacing[2],
          borderRadius: theme.radius.sm,
          borderWidth: 1,
          borderColor: toneColor,
          backgroundColor: bgColor,
          opacity,
          transform: [{ translateY }],
        },
        style,
      ]}
    >
      <View style={{ flex: 1 }}>
        <AppText variant="caption" weight="600" style={{ color: toneColor }}>
          {message}
        </AppText>
      </View>
      {action ? (
        <AppButton
          variant="secondary"
          size="sm"
          title={action.label}
          onPress={action.onPress}
          style={{ paddingHorizontal: theme.spacing[3], paddingVertical: 6, minHeight: 36 }}
        />
      ) : null}
      {dismissible && onDismiss ? (
        <AppButton
          variant="ghost"
          size="sm"
          title="Cerrar"
          onPress={onDismiss}
          style={{ paddingHorizontal: theme.spacing[2], minHeight: 36 }}
        />
      ) : null}
    </Animated.View>
  );
}

/**
 * S5-B — Mapping centralizado AssetsFailure → ErrorBar. Único punto donde se
 * decide qué kind y qué acción muestra cada outcome (sin duplicar la regla
 * por pantalla):
 *
 * - stale_write: warning + "Actualizar" (reconciliar, decisión del usuario;
 *   el draft NO se toca hasta que el usuario actúe).
 * - transient_retryable / unknown_outcome: retry con la MISMA Idempotency-Key
 *   (el caller conserva el intent).
 * - forbidden / definitive (400, 403, 409 dependencia): mensaje humano, sin
 *   retry automático.
 *
 * `action` (S9) permite que la pantalla ofrezca su propia acción tipada
 * sobre el MISMO ErrorBar (por ejemplo "Revisar" los dependientes de un
 * bloqueo 409). No hay un segundo sistema de errores: la acción se decide en
 * un único punto y se renderiza con el mismo primitive.
 */
export function AssetsFailureBar({
  failure,
  onRetry,
  onReconcile,
  action,
  style,
  testID,
}: {
  failure: AssetsFailure | null;
  onRetry?: () => void;
  onReconcile?: () => void;
  /** Acción propia de la pantalla (tiene prioridad sobre la derivada). */
  action?: ErrorBarAction;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  if (!failure) return null;
  const kind: ErrorBarKind =
    failure.kind === 'stale_write' ? 'warning' : 'error';
  const derivedAction =
    failure.kind === 'stale_write' && onReconcile
      ? { label: 'Actualizar', onPress: onReconcile }
      : failure.retryAllowed &&
          (failure.kind === 'transient_retryable' || failure.kind === 'unknown_outcome') &&
          onRetry
        ? { label: 'Reintentar', onPress: onRetry }
        : undefined;
  return (
    <ErrorBar
      visible
      message={failure.message}
      kind={kind}
      action={action ?? derivedAction}
      style={style}
      testID={testID}
    />
  );
}
