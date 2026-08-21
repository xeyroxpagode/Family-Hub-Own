import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, motion, radius, spacing } from '../../constants/theme';
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
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  return (
    <View
      style={[
        {
          minHeight: 52,
          padding: spacing[1],
          borderRadius: radius.lg,
          backgroundColor: colors.surface.raised,
          flexDirection: 'row',
          gap: spacing[1],
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
              minHeight: 44,
              borderRadius: radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? colors.brand : 'transparent',
            }}
          >
            <AppText variant="bodySmall" tone={selected ? 'inverse' : 'secondary'} weight="600">
              {option.label}
            </AppText>
          </InteractivePressable>
        );
      })}
    </View>
  );
}
