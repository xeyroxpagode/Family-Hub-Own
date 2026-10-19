/**
 * Planner V1 — Phase 1 shared Toast system (full implementation).
 *
 * Figma V1.1 §52.9 contract:
 * - Single toast, never a stack (5 completions = 1 band with undo reverting all)
 * - Entrance 200ms, exit 150ms
 * - Suppressed while sheet is open
 * - Undo button only if revert function provided
 * - role="status", aria-live="polite"
 * - Auto-dismiss after 8000ms (configurable)
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useAppTheme } from '../../context/AppThemeContext';
import { usePlannerSheet } from '../../context/PlannerSheetContext';
import { successHaptic, warningHaptic, errorHaptic } from '../../utils/plannerHaptics';
import { AppText } from '../ui/AppText';
import { InteractivePressable } from '../ui/InteractivePressable';

export type PlannerToast = {
  readonly id: string;
  readonly message: string;
  readonly undoLabel?: string;
  readonly onUndo?: () => void;
  readonly durationMs?: number;
  readonly kind?: 'success' | 'warning' | 'error' | 'info';
};

type ToastHostProps = {
  readonly sheetOpen: boolean;
};

const TOAST_ENTER_DURATION_MS = 200;
const TOAST_EXIT_DURATION_MS = 150;
const DEFAULT_DURATION_MS = 8000;

export function ToastHost({ sheetOpen }: ToastHostProps) {
  const { radius, spacing } = useAppTheme();
  const sheet = usePlannerSheet();
  const [toast, setToast] = useState<PlannerToast | null>(null);
  const [visible, setVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(60)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastRef = useRef<PlannerToast | null>(null);
  /**
   * A toast raised while a sheet owned the surface. Held rather than dropped,
   * so feedback for a mutation confirmed from inside the sheet survives.
   */
  const deferredRef = useRef<PlannerToast | null>(null);

  // Listen for pushToast calls from the sheet controller
  useEffect(() => {
    const unsubscribe = sheet.subscribeToToast((newToast) => {
      toastRef.current = newToast;
      showToast(newToast);
    });
    return unsubscribe;
  }, [sheet]);

  /**
   * Suppress the toast WHILE a sheet owns the surface (Figma §52.9: "no dibuja
   * con sheet abierto") — but never destroy it.
   *
   * Productive Task mutations are confirmed from inside the confirm sheet
   * (`onConfirm` pushes the toast, then the sheet closes). Discarding the toast
   * here silently erased the ONLY feedback for a mutation that had in fact
   * been persisted: the user moved a Task to Trash, the write landed, and
   * nothing was ever shown. Instead the toast is held and presented as soon as
   * the sheet releases the surface.
   */
  useEffect(() => {
    if (sheetOpen) {
      if (visible) hideToastImmediate();
      return;
    }
    // The sheet just closed: deliver whatever was withheld.
    if (!visible && deferredRef.current) {
      const pending = deferredRef.current;
      deferredRef.current = null;
      showToast(pending);
    }
  }, [sheetOpen, visible]);

  const showToast = (newToast: PlannerToast) => {
    // A sheet owns the surface right now. Hold the toast (single-toast
    // contract: only the newest is kept) and let the suppression effect present
    // it once the sheet closes.
    if (sheetOpen) {
      hideToastImmediate();
      deferredRef.current = newToast;
      return;
    }

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Trigger haptic based on kind
    switch (newToast.kind) {
      case 'success':
        successHaptic();
        break;
      case 'warning':
        warningHaptic();
        break;
      case 'error':
        errorHaptic();
        break;
    }

    setToast(newToast);
    setVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: TOAST_ENTER_DURATION_MS,
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: TOAST_ENTER_DURATION_MS,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss timer
    const duration = newToast.durationMs ?? DEFAULT_DURATION_MS;
    timerRef.current = setTimeout(() => {
      hideToast();
    }, duration);
  };

  const hideToast = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: TOAST_EXIT_DURATION_MS,
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 60,
        duration: TOAST_EXIT_DURATION_MS,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setVisible(false);
        setToast(null);
        toastRef.current = null;
      }
    });
  };

  const hideToastImmediate = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    fadeAnim.setValue(0);
    translateAnim.setValue(60);
    setVisible(false);
    setToast(null);
    toastRef.current = null;
  };

  const handleUndo = () => {
    if (toast?.onUndo) {
      toast.onUndo();
    }
    hideToast();
  };

  const handleDismiss = () => {
    hideToast();
  };

  if (!visible || !toast) return null;

  const styles = createStyles(radius, spacing);

  return (
    <Animated.View
      style={[
        styles.toast,
        { opacity: fadeAnim, transform: [{ translateY: translateAnim }] },
      ]}
      accessibilityLiveRegion="polite"
      role="status"
    >
      <View style={styles.content}>
        <AppText variant="bodySmall" weight="500" style={styles.message} numberOfLines={3}>
          {toast.message}
        </AppText>
        {toast.undoLabel && toast.onUndo && (
          <InteractivePressable
            style={styles.undoButton}
            onPress={handleUndo}
            accessibilityRole="button"
            accessibilityLabel={toast.undoLabel}
          >
            <AppText variant="bodySmall" weight="700" tone="inverse">
              {toast.undoLabel}
            </AppText>
          </InteractivePressable>
        )}
      </View>
      <InteractivePressable
        style={styles.dismissButton}
        onPress={handleDismiss}
        accessibilityRole="button"
        accessibilityLabel="Descartar"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <AppText variant="caption" weight="600" tone="secondary">
          Descartar
        </AppText>
      </InteractivePressable>
    </Animated.View>
  );
}

function createStyles(
  radius: { readonly lg: number },
  spacing: Record<string, number>,
) {
  return StyleSheet.create({
    toast: {
      position: 'absolute',
      bottom: 104,
      left: 16,
      right: 16,
      borderRadius: radius.lg,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: '#1A1714',
      borderWidth: 1,
      borderColor: '#E7643F',
      shadowColor: '#1A1714',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing[3],
    },
    content: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
    },
    message: {
      flex: 1,
      color: '#FFFFFF',
    },
    undoButton: {
      minHeight: 44,
      borderRadius: radius.lg,
      backgroundColor: '#E7643F',
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
      alignItems: 'center',
      justifyContent: 'center',
    },
    dismissButton: {
      minHeight: 44,
      paddingHorizontal: spacing[2],
      paddingVertical: spacing[1],
    },
  });
}