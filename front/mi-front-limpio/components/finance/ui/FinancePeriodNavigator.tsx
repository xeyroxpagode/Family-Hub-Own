import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { HomePlusIcon } from '../../../constants/icons';
import { useAppTheme } from '../../../context/AppThemeContext';
import { FinanceIconAction } from './FinanceIconAction';
import { FinancePeriodLabel } from './FinanceUtilityRow';
import { FINANCE_CHEVRON_SIZE, FINANCE_HIT_TARGET } from './financeTokens';

export type FinancePeriodNavigatorProps = {
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  previousAccessibilityLabel: string;
  nextAccessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Fixed-slot Finance period navigation authority. */
export function FinancePeriodNavigator({ label, onPrevious, onNext, previousAccessibilityLabel, nextAccessibilityLabel, disabled = false, style, testID }: FinancePeriodNavigatorProps) {
  const { colors } = useAppTheme();
  const iconColor = disabled ? colors.text.tertiary : colors.text.secondary;
  return (
    <View style={[styles.root, style]} testID={testID}>
      <View style={styles.side}>
        <FinanceIconAction onPress={onPrevious} disabled={disabled} accessibilityLabel={previousAccessibilityLabel}>
          <HomePlusIcon name="chevron-back-outline" size={FINANCE_CHEVRON_SIZE} color={iconColor} />
        </FinanceIconAction>
      </View>
      <View style={styles.center}><FinancePeriodLabel label={label} /></View>
      <View style={styles.side}>
        <FinanceIconAction onPress={onNext} disabled={disabled} accessibilityLabel={nextAccessibilityLabel}>
          <HomePlusIcon name="chevron-forward-outline" size={FINANCE_CHEVRON_SIZE} color={iconColor} />
        </FinanceIconAction>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { minHeight: FINANCE_HIT_TARGET, flexDirection: 'row', alignItems: 'center' },
  side: { width: FINANCE_HIT_TARGET, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
});
