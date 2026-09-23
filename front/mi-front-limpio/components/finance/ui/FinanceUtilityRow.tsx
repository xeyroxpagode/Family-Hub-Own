import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '../../ui/AppText';
import { FINANCE_HIT_TARGET, FINANCE_UTILITY_ROW_MIN_HEIGHT } from './financeTokens';

export type FinancePeriodLabelProps = {
  label: string;
  testID?: string;
};

/**
 * Stage 7A — one period-label presentation authority.
 * Covers "SEPTIEMBRE 2026" and "2026". Presentation only; business/date
 * semantics are owned by the existing finance services.
 */
export function FinancePeriodLabel({ label, testID }: FinancePeriodLabelProps) {
  return (
    <AppText variant="bodySmall" weight="800" align="center" numberOfLines={1} testID={testID} style={{ textTransform: 'uppercase' }}>
      {label}
    </AppText>
  );
}

export type FinanceUtilityRowProps = {
  /** Left slot (e.g. trash / currency badge). Missing slot keeps center optically centered. */
  left?: React.ReactNode;
  /** Center period text, or a custom center node. */
  period?: string;
  center?: React.ReactNode;
  /** Right slot (e.g. "+" create action). */
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Stage 7A — utility/period row grammar: LEFT SLOT | CENTER CONTEXT | RIGHT SLOT.
 *
 * The center stays optically centered: side slots reserve a fixed minimum
 * width (44) even when empty. Icon-only controls inside the slots must use
 * ~44px hit targets with a visually light icon (AppButton variant="icon"
 * size="sm"); no giant circular visible buttons.
 */
export function FinanceUtilityRow({ left, period, center, right, style, testID }: FinanceUtilityRowProps) {
  const styles = StyleSheet.create({
    root: {
      minHeight: FINANCE_UTILITY_ROW_MIN_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
    },
    side: {
      minWidth: FINANCE_HIT_TARGET,
      alignItems: 'center',
      justifyContent: 'center',
    },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', minWidth: 0 },
  });

  return (
    <View style={[styles.root, style]} testID={testID}>
      <View style={styles.side}>{left}</View>
      <View style={styles.center}>{center ?? (period ? <FinancePeriodLabel label={period} /> : null)}</View>
      <View style={styles.side}>{right}</View>
    </View>
  );
}
