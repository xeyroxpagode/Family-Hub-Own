/**
 * Planner V1 — Phase 1 shared confirmation sheet (confirm kind, 5 verbs) - minimal.
 */

import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, findNodeHandle, StyleSheet, View } from 'react-native';

import { useAppTheme } from '../../context/AppThemeContext';
import { usePlannerSheet } from '../../context/PlannerSheetContext';
import { warningHaptic } from '../../utils/plannerHaptics';
import { AppText } from '../ui/AppText';
import { InteractivePressable } from '../ui/InteractivePressable';

export type PlannerConfirmSheetData = {
  readonly title: string;
  readonly body: string;
  readonly safeLabel: string;
  readonly destructiveLabel: string;
  readonly destructiveTone?: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
};

export function PlannerConfirmSheet({ data }: { readonly data: PlannerConfirmSheetData }) {
  const { colors, radius, spacing } = useAppTheme();
  const styles = createStyles(spacing);
  const sheet = usePlannerSheet();
  const safeButtonRef = React.useRef<View>(null);

  React.useEffect(() => {
    const node = findNodeHandle(safeButtonRef.current);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
  }, []);

  return (
    <View style={styles.body}>
      <AppText variant="title3" weight="800" style={styles.title}>{data.title}</AppText>
      <AppText variant="bodySmall" tone="secondary" style={styles.description}>{data.body}</AppText>
      <View style={styles.actions}>
        <View ref={safeButtonRef} collapsable={false}>
          <InteractivePressable style={styles.safeButton} onPress={() => { data.onCancel(); sheet.attemptClose('user_request'); }} accessibilityRole="button" accessibilityLabel={data.safeLabel}>
            <AppText variant="body" weight="700" tone="inverse">{data.safeLabel}</AppText>
          </InteractivePressable>
        </View>
        {data.destructiveLabel ? (
          <InteractivePressable style={data.destructiveTone ? styles.destructiveButtonDanger : styles.destructiveButtonBrand} onPress={() => { if (data.destructiveTone) warningHaptic(); data.onConfirm(); sheet.attemptClose('user_request'); }} accessibilityRole="button" accessibilityLabel={data.destructiveLabel}>
            <AppText variant="body" weight="700" tone="inverse">{data.destructiveLabel}</AppText>
          </InteractivePressable>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(spacing: Record<string, number>) {
  return StyleSheet.create({
    body: { paddingTop: 8, paddingBottom: 20, paddingHorizontal: 16, alignItems: 'stretch' },
    title: { textAlign: 'center', marginBottom: 8 },
    description: { textAlign: 'center', marginBottom: 20 },
    actions: { gap: 8 },
    safeButton: { minHeight: 48, borderRadius: 16, backgroundColor: '#1A1714', alignItems: 'center', justifyContent: 'center' },
    destructiveButtonBrand: { minHeight: 48, borderRadius: 16, backgroundColor: '#E7643F', alignItems: 'center', justifyContent: 'center' },
    destructiveButtonDanger: { minHeight: 48, borderRadius: 16, backgroundColor: '#D64C5A', alignItems: 'center', justifyContent: 'center' },
  });
}

// Types already exported at top