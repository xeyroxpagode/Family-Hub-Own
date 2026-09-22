import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '../../context/AppThemeContext';
import { AppText } from './AppText';
import { InteractivePressable } from './InteractivePressable';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

export type SegmentedControlProps<T extends string> = {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  density?: 'compact' | 'form';
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  style,
  density = 'compact',
}: SegmentedControlProps<T>) {
  const { colors, motion, radius, spacing } = useAppTheme();
  const containerHeight = density === 'form' ? 48 : 44;
  const optionHeight = density === 'form' ? 40 : 36;
  return (
    <View
      style={[
        {
          minHeight: containerHeight,
          padding: spacing[1],
          borderRadius: radius.xl,
          backgroundColor: colors.surface.muted,
          flexDirection: 'row',
          gap: density === 'form' ? spacing[1] : 0,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <InteractivePressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            haptic="light"
            pressScale={motion.scale.button}
            pressedOpacity={0.85}
            style={{
              flex: 1,
              minHeight: optionHeight,
              borderRadius: radius.lg,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? colors.terracotta[600] : 'transparent',
            }}
          >
            <AppText variant="bodySmall" tone={selected ? 'inverse' : 'secondary'} weight="800">
              {option.label}
            </AppText>
          </InteractivePressable>
        );
      })}
    </View>
  );
}
