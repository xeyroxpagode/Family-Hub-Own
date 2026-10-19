/**
 * Planner V1 — Phase 1 discard-question view.
 *
 * Figma V1.1 §23.7.3 (measured `task-form-dirty-guard`):
 * - REPLACES the form body while asking (the form itself stays mounted but
 *   hidden, so `Seguir editando` restores the draft byte for byte).
 * - Accessible name of the sheet becomes the question.
 * - `Seguir editando` is the safe action and receives initial focus.
 * - `Descartar` is the ONLY destructive exit; it carries the danger tone and
 *   a warning haptic.
 * - Buttons: full width, 48 px tall, radius 16.
 */

import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, findNodeHandle, StyleSheet, View } from 'react-native';

import { useAppTheme } from '../../context/AppThemeContext';
import { PLANNER_SHEET_GUARD_COPY } from '../../services/planner/plannerSheetGuard';
import { warningHaptic } from '../../utils/plannerHaptics';
import { AppText } from '../ui/AppText';
import { InteractivePressable } from '../ui/InteractivePressable';

type PlannerSheetGuardViewProps = {
  readonly onKeepEditing: () => void;
  readonly onDiscard: () => void;
};

export function PlannerSheetGuardView({ onKeepEditing, onDiscard }: PlannerSheetGuardViewProps) {
  const { colors, radius, spacing } = useAppTheme();
  const styles = createGuardStyles(colors, radius, spacing);
  const keepEditingRef = useRef<View>(null);

  // Focus the SAFE option when the question appears (Figma: foco inicial =
  // "Seguir editando", nunca la destructiva).
  useEffect(() => {
    const node = findNodeHandle(keepEditingRef.current);
    if (node) {
      AccessibilityInfo.setAccessibilityFocus(node);
    }
  }, []);

  return (
    <View style={styles.body}>
      <AppText variant="title3" weight="800" style={styles.title}>
        {PLANNER_SHEET_GUARD_COPY.title}
      </AppText>
      <AppText variant="bodySmall" tone="secondary" style={styles.description}>
        {PLANNER_SHEET_GUARD_COPY.body}
      </AppText>
      <View style={styles.actions}>
        <View ref={keepEditingRef} collapsable={false}>
          <InteractivePressable
            style={styles.keepEditingButton}
            onPress={onKeepEditing}
            accessibilityRole="button"
            accessibilityLabel={PLANNER_SHEET_GUARD_COPY.keepEditing}
          >
            <AppText variant="body" weight="700" tone="inverse">
              {PLANNER_SHEET_GUARD_COPY.keepEditing}
            </AppText>
          </InteractivePressable>
        </View>
        <InteractivePressable
          style={styles.discardButton}
          onPress={() => {
            warningHaptic();
            onDiscard();
          }}
          accessibilityRole="button"
          accessibilityLabel={PLANNER_SHEET_GUARD_COPY.discard}
        >
          <AppText variant="body" weight="700" tone="inverse">
            {PLANNER_SHEET_GUARD_COPY.discard}
          </AppText>
        </InteractivePressable>
      </View>
    </View>
  );
}

function createGuardStyles(
  colors: { text: { primary: string }; danger: { base: string } },
  radius: { readonly lg: number },
  spacing: Record<string, number>,
) {
  return StyleSheet.create({
    body: {
      paddingTop: spacing[2],
      paddingBottom: spacing[4],
      paddingHorizontal: spacing[1],
      alignItems: 'stretch',
    },
    title: {
      textAlign: 'center',
      marginBottom: spacing[2],
    },
    description: {
      textAlign: 'center',
      marginBottom: spacing[5],
    },
    actions: {
      gap: spacing[2],
    },
    // Figma measure: `Seguir editando` is ink-on-white (dark button, inverse
    // text). `colors.text.primary` is the ink token and adapts to dark mode.
    keepEditingButton: {
      minHeight: 48,
      borderRadius: radius.lg,
      backgroundColor: colors.text.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    discardButton: {
      minHeight: 48,
      borderRadius: radius.lg,
      backgroundColor: colors.danger.base,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
