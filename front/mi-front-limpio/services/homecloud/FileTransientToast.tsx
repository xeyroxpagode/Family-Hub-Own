import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { AppText } from '../../components/ui/AppText';

/**
 * PATCH 1B — TRANSIENT operation feedback for Files bulk operations.
 *
 * A move success is a FLOATING toast, never a row in the browser layout: it
 * overlays content (absolute position), reserves no vertical space, never
 * pushes the grid, never alters the contextual header geometry, and
 * auto-dismisses after a short conventional duration. Errors that need user
 * recovery are stated elsewhere and may remain visible; THIS surface is for
 * brief success confirmations only.
 *
 * Reuses the app's existing snackbar visual language (same card, same shadow
 * as `FileUndoSnackbar` and the upload pill) — no new notification system.
 *
 * PATCH 1C — the toast may carry ONE optional action (e.g. scanner save's
 * `Abrir`). The action stays tappable while the toast is visible; tapping it
 * is the caller's contract (dismiss + do the thing). No layout surface is
 * ever created for success feedback.
 */
export type TransientToastTone = 'success' | 'secondary' | 'danger';

/** One optional, named action presented at the trailing edge of the toast. */
export interface FileTransientToastAction {
  readonly label: string;
  readonly onAction: () => void;
}

export interface FileTransientToastValue {
  readonly tone: TransientToastTone;
  readonly message: string;
  readonly action?: FileTransientToastAction;
}

/** Conventional short duration when no app feedback token exists (~2.75 s). */
export const TRANSIENT_TOAST_DURATION_MS = 2750;

export function FileTransientToast({
  value,
  bottomOffset,
  onDismiss,
  durationMs = TRANSIENT_TOAST_DURATION_MS,
}: {
  value: FileTransientToastValue | null;
  /** Above safe-area/navbar (and above the upload pill when it is on screen). */
  bottomOffset: number;
  onDismiss: () => void;
  /**
   * Auto-dismiss delay. `null` pins the toast (in-flight progress: it is
   * replaced by the terminal outcome, never by a clock).
   */
  durationMs?: number | null;
}) {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(value !== null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value === null) {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      Animated.timing(progress, {
        toValue: 0,
        duration: reducedMotion ? 40 : 160,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setMounted(false));
      return undefined;
    }
    setMounted(true);
    Animated.timing(progress, {
      toValue: 1,
      duration: reducedMotion ? 40 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    if (durationMs !== null) timerRef.current = setTimeout(onDismiss, durationMs);
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [value, onDismiss, durationMs, progress, reducedMotion]);

  if (!mounted || value === null) return null;

  return (
    <Animated.View
      // box-none: the toast itself never intercepts touches — only its own
      // action target does, so content underneath stays usable.
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          bottom: bottomOffset,
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        },
      ]}
    >
      <View
        accessibilityRole="alert"
        accessibilityLabel={value.message}
        style={[styles.bar, value.tone === 'danger' && styles.barDanger]}
      >
        <AppText variant="bodySmall" weight="600" numberOfLines={2} style={styles.message}>
          {value.message}
        </AppText>
        {value.action ? (
          <Pressable
            onPress={value.action.onAction}
            accessibilityRole="button"
            accessibilityLabel={value.action.label}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          >
            <AppText variant="bodySmall" weight="800" style={styles.actionLabel}>{value.action.label}</AppText>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    zIndex: 25,
    alignItems: 'center',
  },
  bar: {
    minHeight: 48,
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.card,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
  },
  barDanger: {
    borderColor: colors.danger.base,
  },
  message: { color: colors.text.primary, textAlign: 'center', flex: 1 },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing[2] },
  actionPressed: { opacity: 0.6 },
  actionLabel: { color: colors.terracotta[600] },
});
