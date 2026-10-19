/**
 * Planner V1 — Phase 1 shared Context Banner (S-3) - minimal.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useAppTheme } from '../../context/AppThemeContext';
import { AppText } from '../ui/AppText';
import { AppButton } from '../ui/AppButton';

export type ContextBannerKind = 'offline' | 'queue' | 'ok' | 'warn';

export type ContextBannerProps = {
  readonly kind: ContextBannerKind;
  readonly message: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  readonly autoDismissMs?: number;
};

const configMap = {
  offline: { bg: 'ink', text: 'inverse', actionColor: 'inverse' },
  queue:   { bg: 'warningSoft', text: 'warning', actionColor: 'warning' },
  ok:      { bg: 'successSoft', text: 'success', actionColor: 'success' },
  warn:    { bg: 'soft', text: 'pressed', actionColor: 'pressed' },
} as const;

export function ContextBanner({ kind, message, actionLabel, onAction, autoDismissMs = 4000 }: { readonly kind: ContextBannerKind; readonly message: string; readonly actionLabel?: string; readonly onAction?: () => void; readonly autoDismissMs?: number }) {
  const { colors, radius, spacing } = useAppTheme();
  const styles = createStyles(spacing);
  const config = configMap[kind];
  const [visible, setVisible] = React.useState(true);
  const fadeAnim = React.useRef(new Animated.Value(1)).current;
  const autoDismissRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (kind === 'ok' || kind === 'warn') {
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(
          ({ finished }) => { if (finished) setVisible(false); }
        );
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [kind, fadeAnim]);

  if (!visible) return null;

  const bgColor = '#1A1714';
  const textColor = '#FFFFFF';
  const actionColor = '#E7643F';

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor: bgColor, borderRadius: 16, opacity: fadeAnim },
        { marginHorizontal: spacing[4], marginTop: spacing[2] },
      ]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.content}>
        <AppText variant="bodySmall" weight="700" style={styles.icon}>{kind === 'offline' ? '⚠' : kind === 'queue' ? '⏳' : kind === 'ok' ? '✓' : '⚠'}</AppText>
        <AppText variant="bodySmall" weight="500" style={[styles.message, { color: textColor }]} numberOfLines={2}>{message}</AppText>
        {actionLabel && onAction && (
          <AppButton
            title={actionLabel}
            variant="ghost"
            size="sm"
            onPress={onAction}
            style={styles.action}
            accessibilityLabel={actionLabel}
          >
            <AppText variant="caption" weight="700" style={{ color: actionColor, minHeight: 32 }}>{actionLabel}</AppText>
          </AppButton>
        )}
      </View>
    </Animated.View>
  );
}

function createStyles(spacing: Record<string, number>) {
  return StyleSheet.create({
    banner: { paddingHorizontal: 16, paddingVertical: 12, minHeight: 40, borderRadius: 16 },
    content: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    icon: { fontSize: 16 },
    message: { flex: 1, flexShrink: 1 },
    action: { flexShrink: 0, marginLeft: 8 },
  });
}

// Types already exported at top