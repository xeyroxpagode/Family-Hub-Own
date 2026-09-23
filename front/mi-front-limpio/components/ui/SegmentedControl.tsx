import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, type StyleProp, type ViewStyle } from 'react-native';

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
  /** GPS contract: sizing + animated pill. */
  size?: 'regular' | 'compact';
  animatedActive?: boolean;
  /** Planner contract: density variants. */
  density?: 'compact' | 'form';
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  style,
  size,
  animatedActive = false,
  density = 'compact',
}: SegmentedControlProps<T>) {
  const { colors, motion, radius, spacing } = useAppTheme();
  // Legacy GPS callers pass size/animatedActive explicitly; Planner callers pass density.
  // Preserve each caller's visuals: GPS style for size/animated usage, PF terracotta style otherwise.
  const useGpsStyle = animatedActive || size !== undefined;
  const compact = (size ?? 'regular') === 'compact';

  const [width, setWidth] = useState(0);
  const activeIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const activePosition = useRef(new Animated.Value(activeIndex)).current;
  const containerPadding = compact ? 2 : spacing[1];
  const itemGap = compact ? 2 : spacing[1];
  const itemWidth =
    width > 0
      ? Math.max(0, (width - containerPadding * 2 - itemGap * (options.length - 1)) / options.length)
      : 0;

  useEffect(() => {
    if (!useGpsStyle) return;
    if (!animatedActive || width === 0) {
      activePosition.setValue(activeIndex);
      return;
    }
    Animated.timing(activePosition, {
      toValue: activeIndex,
      duration: motion.navActive,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, activePosition, animatedActive, useGpsStyle, width, motion.navActive]);

  if (!useGpsStyle) {
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

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[
        {
          minHeight: compact ? 44 : 52,
          padding: compact ? 2 : spacing[1],
          borderRadius: compact ? radius.full : radius.lg,
          backgroundColor: colors.background.soft,
          borderWidth: 1,
          borderColor: colors.border.subtle,
          flexDirection: 'row',
          gap: compact ? 2 : spacing[1],
          position: 'relative',
        },
        style,
      ]}
    >
      {animatedActive && itemWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: containerPadding,
            bottom: containerPadding,
            left: containerPadding,
            width: itemWidth,
            borderRadius: radius.full,
            backgroundColor: colors.surface.card,
            borderWidth: 1,
            borderColor: colors.border.default,
            transform: [{ translateX: Animated.multiply(activePosition, itemWidth + itemGap) }],
          }}
        />
      ) : null}
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
              minHeight: compact ? 40 : 44,
              borderRadius: compact ? radius.full : radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: animatedActive ? 'transparent' : selected ? colors.surface.card : 'transparent',
              borderWidth: animatedActive ? 0 : selected ? 1 : 0,
              borderColor: animatedActive ? 'transparent' : selected ? colors.border.default : 'transparent',
              zIndex: 1,
            }}
          >
            <AppText variant="bodySmall" tone={selected ? 'brand' : 'secondary'} weight="600">
              {option.label}
            </AppText>
          </InteractivePressable>
        );
      })}
    </View>
  );
}
