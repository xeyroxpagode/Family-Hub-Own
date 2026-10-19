/**
 * Planner V1 — Phase 1 shared destructive confirmation sheet (L-2) - minimal.
 */

import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, findNodeHandle, StyleSheet, View } from 'react-native';

import { useAppTheme } from '../../context/AppThemeContext';
import { usePlannerSheet } from '../../context/PlannerSheetContext';
import { warningHaptic } from '../../utils/plannerHaptics';
import { AppText } from '../ui/AppText';
import { InteractivePressable } from '../ui/InteractivePressable';

export type PlannerDestructiveConfirm = {
  readonly verb: string;
  readonly objectName: string;
  readonly body: string;
  readonly destructiveLabel: string;
  readonly safeLabel: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
};

export function PlannerConfirmDestructiveSheet({ data }: { readonly data: PlannerDestructiveConfirm }) {
  const { colors, radius, spacing } = useAppTheme();
  const styles = createStyles(spacing);
  const sheet = usePlannerSheet();
  const safeButtonRef = React.useRef<View>(null);

  React.useEffect(() => {
    const node = findNodeHandle(safeButtonRef.current);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
  }, []);

  React.useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${data.verb} ${data.objectName}? ${data.body}`);
  }, [data.verb, data.objectName, data.body]);

  return (
    <View style={styles.body}>
      <AppText variant="title3" weight="800" style={styles.title}>{data.verb} {data.objectName}?</AppText>
      <AppText variant="bodySmall" tone="secondary" style={styles.description}>{data.body}</AppText>
      <View style={styles.actions}>
        <View ref={safeButtonRef} collapsable={false}>
          <InteractivePressable style={styles.safeButton} onPress={() => { data.onCancel(); sheet.attemptClose('user_request'); }} accessibilityRole="button" accessibilityLabel={data.safeLabel}>
            <AppText variant="body" weight="700" tone="inverse">{data.safeLabel}</AppText>
          </InteractivePressable>
        </View>
        <InteractivePressable style={styles.destructiveButton} onPress={() => { warningHaptic(); data.onConfirm(); sheet.attemptClose('user_request'); }} accessibilityRole="button" accessibilityLabel={data.destructiveLabel}>
          <AppText variant="body" weight="700" tone="inverse">{data.destructiveLabel}</AppText>
        </InteractivePressable>
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
    destructiveButton: { minHeight: 48, borderRadius: 16, backgroundColor: '#D64C5A', alignItems: 'center', justifyContent: 'center' },
  });
}

// Types already exported at top