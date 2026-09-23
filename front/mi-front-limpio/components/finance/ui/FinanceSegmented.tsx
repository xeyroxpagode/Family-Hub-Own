import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '../../../context/AppThemeContext';
import { AppText } from '../../ui/AppText';
import { InteractivePressable } from '../../ui/InteractivePressable';

export type FinanceSegmentedOption<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export type FinanceSegmentedVariant = 'standard' | 'compact' | 'filter';
export type FinanceSegmentedDistribution = 'equal' | 'content';

export type FinanceSegmentedProps<T extends string> = {
  value: T;
  options: FinanceSegmentedOption<T>[];
  onChange: (value: T) => void;
  /** standard = primary tabs, compact = local choices, filter = connected multi-filters. */
  variant?: FinanceSegmentedVariant;
  /** equal fills available width; content sizes segments around their labels. */
  distribution?: FinanceSegmentedDistribution;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export type FinanceSegmentedMultiProps<T extends string> = {
  values: T[];
  options: FinanceSegmentedOption<T>[];
  onToggle: (value: T) => void;
  /** Multi-select is only meaningful for the filter family. */
  variant?: Extract<FinanceSegmentedVariant, 'filter'>;
  distribution?: FinanceSegmentedDistribution;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Stage 7B — one Finance segmented authority with final standard, compact,
 * and filter variants.
 *
 * Shared: track language, selected fill, radii family, typography family,
 * pressed/disabled behavior, Light/Dark tokens, radio semantics.
 * Differences allowed: geometry, text size, internal padding, and layout
 * distribution. FILTER is the connected multi-select family (7C Movimientos
 * filters: multi-select, at least one selected, adjacent selected segments
 * merge into one visual run).
 *
 * 7B/7C/7D migrate consumers branch-by-branch (see README migration map).
 * Do NOT mass-migrate in 7A.
 */
export function FinanceSegmented<T extends string>({
  value,
  options,
  onChange,
  variant = 'standard',
  distribution = 'equal',
  style,
  testID,
}: FinanceSegmentedProps<T>) {
  const theme = useAppTheme();
  const { colors, spacing } = theme;
  const metrics = {
    standard: { track: 48, selected: 40, outerRadius: 24, selectedRadius: 20, textVariant: 'bodySmall' as const, weight: '800' as const, horizontalPadding: spacing[2] },
    compact: { track: 40, selected: 32, outerRadius: 20, selectedRadius: 14, textVariant: 'caption' as const, weight: '700' as const, horizontalPadding: spacing[1] },
    filter: { track: 44, selected: 36, outerRadius: 22, selectedRadius: 18, textVariant: 'bodySmall' as const, weight: '800' as const, horizontalPadding: spacing[2] },
  }[variant];
  const equal = distribution === 'equal';

  return (
    <View
      accessibilityRole="radiogroup"
      testID={testID}
      style={[
        {
          height: metrics.track,
          padding: 4,
          borderRadius: metrics.outerRadius,
          backgroundColor: colors.surface.muted,
          flexDirection: 'row',
          gap: spacing[1],
        },
        style,
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        const disabled = option.disabled === true;
        return (
          <InteractivePressable
            key={option.value}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            haptic="light"
            pressedOpacity={0.85}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            style={{
              ...(equal ? { flex: 1 } : { flexGrow: 0, flexShrink: 0, alignSelf: 'flex-start' as const }),
              height: metrics.selected,
              borderRadius: metrics.selectedRadius,
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 0,
              paddingHorizontal: metrics.horizontalPadding,
              backgroundColor: selected ? colors.terracotta[600] : 'transparent',
            }}
          >
            <AppText
              variant={metrics.textVariant}
              weight={metrics.weight}
              tone={selected ? 'inverse' : 'secondary'}
              numberOfLines={1}
            >
              {option.label}
            </AppText>
          </InteractivePressable>
        );
      })}
    </View>
  );
}

/**
 * Stage 7C — connected multi-select filter family.
 *
 * Same track language / terracotta selection / radii progression /
 * typography family as STANDARD/COMPACT. Multi-select with at-least-one
 * semantics owned by the caller; adjacent selected segments merge into one
 * continuous run (inner corners square, outer corners rounded).
 */
export function FinanceSegmentedMulti<T extends string>({
  values,
  options,
  onToggle,
  variant = 'filter',
  distribution = 'equal',
  style,
  testID,
}: FinanceSegmentedMultiProps<T>) {
  const theme = useAppTheme();
  const { colors, spacing } = theme;
  const metrics = {
    standard: { track: 48, selected: 40, outerRadius: 24, selectedRadius: 20, textVariant: 'bodySmall' as const, weight: '800' as const, horizontalPadding: spacing[2] },
    compact: { track: 40, selected: 32, outerRadius: 20, selectedRadius: 14, textVariant: 'caption' as const, weight: '700' as const, horizontalPadding: spacing[1] },
    filter: { track: 44, selected: 36, outerRadius: 22, selectedRadius: 18, textVariant: 'bodySmall' as const, weight: '800' as const, horizontalPadding: spacing[2] },
  }[variant];
  const equal = distribution === 'equal';

  return (
    <View
      accessibilityRole="tablist"
      testID={testID}
      style={[
        {
          height: metrics.track,
          padding: 4,
          borderRadius: metrics.outerRadius,
          backgroundColor: colors.surface.muted,
          flexDirection: 'row',
          gap: 0,
        },
        style,
      ]}
    >
      {options.map((option, index) => {
        const selected = values.includes(option.value);
        const disabled = option.disabled === true;
        const previousSelected = index > 0 && values.includes(options[index - 1].value);
        const nextSelected = index < options.length - 1 && values.includes(options[index + 1].value);
        return (
          <InteractivePressable
            key={option.value}
            onPress={() => onToggle(option.value)}
            disabled={disabled}
            haptic="light"
            pressedOpacity={0.85}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            style={{
              ...(equal ? { flex: 1 } : { flexGrow: 0, flexShrink: 0, alignSelf: 'flex-start' as const }),
              height: metrics.selected,
              borderTopLeftRadius: selected && previousSelected ? 0 : metrics.selectedRadius,
              borderBottomLeftRadius: selected && previousSelected ? 0 : metrics.selectedRadius,
              borderTopRightRadius: selected && nextSelected ? 0 : metrics.selectedRadius,
              borderBottomRightRadius: selected && nextSelected ? 0 : metrics.selectedRadius,
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 0,
              paddingHorizontal: metrics.horizontalPadding,
              backgroundColor: selected ? colors.terracotta[600] : 'transparent',
            }}
          >
            <AppText
              variant={metrics.textVariant}
              weight={metrics.weight}
              tone={selected ? 'inverse' : 'secondary'}
              numberOfLines={1}
            >
              {option.label}
            </AppText>
          </InteractivePressable>
        );
      })}
    </View>
  );
}
