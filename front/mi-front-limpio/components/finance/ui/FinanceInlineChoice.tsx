import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '../../ui/AppText';
import { SegmentedControl, type SegmentOption } from '../../ui/SegmentedControl';
import { financeSpacing } from './financeTokens';

export type FinanceInlineChoiceProps<T extends string> = {
  label?: string;
  helperText?: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Stage 7A — compact choice pattern for small finite option sets.
 *
 * INLINE when: small finite set, no search, no large catalog, affects only
 * the current form, fits comfortably (e.g. No/Weekly/Monthly/Yearly,
 * Full/Partial, Monthly/Annual, scope choices). Otherwise use a CHILD SHEET
 * (search/catalog/grid/calendar) or a CONFIRMATION sheet (destructive /
 * lifecycle consequences). See README policy.
 *
 * Renders compact segmented with radio semantics; supports selected /
 * unselected / disabled, optional helper, Light/Dark, accessibility.
 * For >4 options prefer stacked FinanceSelectionRow entries instead.
 */
export function FinanceInlineChoice<T extends string>({
  label,
  helperText,
  value,
  options,
  onChange,
  style,
  testID,
}: FinanceInlineChoiceProps<T>) {
  return (
    <View style={[{ gap: financeSpacing.contentActionGap }, style]} testID={testID}>
      {label ? (
        <AppText variant="caption" tone="secondary" weight="700">
          {label}
        </AppText>
      ) : null}
      <SegmentedControl size="compact" fullWidth value={value} options={options} onChange={onChange} />
      {helperText ? (
        <AppText variant="caption" tone="tertiary">
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}
