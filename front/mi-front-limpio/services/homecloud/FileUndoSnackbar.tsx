import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { AppText } from '../../components/ui/AppText';

/**
 * HomeCloud HC-POL-018 — THE UNDO SNACKBAR for a Files trash.
 *
 * WHY IT IS NOT `UndoToast`
 * -------------------------
 * The shared `UndoToast` carries a fixed `duration` and a terracotta-dominant
 * action pill. Both are wrong here for two independent reasons:
 *
 *  1. HC-POL-018 forbids inventing an expiry. Sending a File to the Papelera is
 *     REVERSIBLE and stays reversible until it is purged, so `Deshacer` is a
 *     live action for as long as the File is still in the trash. A timer that
 *     hides a working action would tell the member the opposite of the truth.
 *  2. The snackbar is the second chance, not a success banner: it must not wear
 *     the dominant accent, and its touch target must be >= 44 pt.
 *
 * So the snackbar is dismissed by the member (or by the next action) and never
 * by a clock. Entry is 160-200 ms from the bottom edge; reduced motion is a
 * plain, instant presence change.
 */

export interface FileUndoSnackbarProps {
  visible: boolean;
  /** What was done, in the member's own words. */
  message: string;
  /** Runs the REAL restore. Resolves when the restore attempt is over. */
  onUndo: () => void | Promise<void>;
  onDismiss: () => void;
  /** True while the restore request is in flight, so the action fires once. */
  busy?: boolean;
  /** Above the selection bar / upload pill when those are on screen. */
  bottomOffset: number;
}

export function FileUndoSnackbar({
  visible,
  message,
  onUndo,
  onDismiss,
  busy = false,
  bottomOffset,
}: FileUndoSnackbarProps) {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  // Kept mounted while the exit runs, so the member sees it leave instead of
  // watching the row above it jump up.
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: reducedMotion ? 40 : 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return undefined;
    }
    Animated.timing(progress, {
      toValue: 0,
      duration: reducedMotion ? 40 : 160,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setMounted(false));
    return undefined;
  }, [visible, progress, reducedMotion]);

  if (!mounted) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: bottomOffset,
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
        },
      ]}
    >
      <View
        accessibilityRole="alert"
        accessibilityLabel={message}
        style={styles.bar}
      >
        <AppText variant="bodySmall" weight="600" numberOfLines={2} style={styles.message}>
          {message}
        </AppText>
        <Pressable
          onPress={() => void onUndo()}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={busy ? 'Restaurando el archivo' : 'Deshacer, restaurar el archivo'}
          style={({ pressed }) => [styles.undo, (pressed || busy) && styles.undoPressed]}
        >
          <AppText variant="micro" weight="800">
            {busy ? 'Restaurando…' : 'Deshacer'}
          </AppText>
        </Pressable>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Cerrar el aviso"
          style={({ pressed }) => [styles.close, pressed && styles.undoPressed]}
        >
          <AppText variant="micro" weight="800">
            ✕
          </AppText>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    zIndex: 20,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    minHeight: 52,
    paddingHorizontal: spacing[3],
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
  message: { flex: 1, color: colors.text.primary },
  /** The second chance, not a success banner: a calm accent, never the loud one. */
  undo: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.soft,
  },
  undoPressed: { opacity: 0.72 },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
});
