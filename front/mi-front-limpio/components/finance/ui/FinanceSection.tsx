import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { HomePlusIcon } from '../../../constants/icons';
import { useAppTheme } from '../../../context/AppThemeContext';
import { AppText } from '../../ui/AppText';
import { InteractivePressable } from '../../ui/InteractivePressable';
import { FINANCE_CHEVRON_SIZE, financeSpacing } from './financeTokens';

export type FinanceSectionProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionAccessibilityLabel?: string;
  /** Renders the subtle trailing boundary. Set false on the last section. */
  divided?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Stage 7A — FinanceSection grammar.
 *
 * FLAT SECTION by default: title -> content -> optional action footer ->
 * subtle boundary. Separation comes from spacing + the action footer + the
 * boundary, never from wrapping the section in a card.
 *
 * Parents stack sections with `financeSpacing.sectionGap` (28).
 */
export function FinanceSection({
  title,
  subtitle,
  actionLabel,
  onAction,
  actionAccessibilityLabel,
  divided = true,
  children,
  style,
  contentStyle,
  testID,
}: FinanceSectionProps) {
  const theme = useAppTheme();
  const { colors, motion, touchTargets } = theme;
  const styles = StyleSheet.create({
    root: { gap: financeSpacing.titleContentGap },
    header: { gap: 2 },
    action: {
      minHeight: touchTargets.normal,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
      marginTop: financeSpacing.contentActionGap,
    },
    boundary: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border.subtle,
      marginTop: financeSpacing.boundaryGap,
    },
  });

  return (
    <View style={[styles.root, style]} testID={testID}>
      <View style={styles.header}>
        <AppText variant="title3" weight="700">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="secondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={contentStyle}>{children}</View>
      {actionLabel && onAction ? (
        <InteractivePressable
          onPress={onAction}
          haptic="light"
          pressScale={motion.scale.tab}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
        >
          <AppText variant="bodySmall" tone="brand" weight="600">
            {actionLabel}
          </AppText>
          <HomePlusIcon name="chevron-forward-outline" size={FINANCE_CHEVRON_SIZE} color={colors.brand} />
        </InteractivePressable>
      ) : null}
      {divided ? <View style={styles.boundary} /> : null}
    </View>
  );
}
