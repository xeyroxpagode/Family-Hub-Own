import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable } from 'react-native';

import { colors, componentSizes, motion, radius } from '../../constants/theme';
import { lightHaptic } from '../../utils/haptics';

export type ToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

export function Toggle({ value, onValueChange, accessibilityLabel, disabled = false }: ToggleProps) {
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: reduceMotion ? 0 : motion.toggle,
      useNativeDriver: false,
    }).start();
  }, [progress, reduceMotion, value]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [2, componentSizes.toggleWidth - componentSizes.toggleThumb - 2],
  });
  const backgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.ink5, colors.brand],
  });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => {
        void lightHaptic();
        onValueChange(!value);
      }}
      style={{ opacity: disabled ? 0.55 : 1 }}
    >
      <Animated.View
        style={{
          width: componentSizes.toggleWidth,
          height: componentSizes.toggleHeight,
          borderRadius: radius.full,
          backgroundColor,
          justifyContent: 'center',
        }}
      >
        <Animated.View
          style={{
            width: componentSizes.toggleThumb,
            height: componentSizes.toggleThumb,
            borderRadius: radius.full,
            backgroundColor: colors.surface.card,
            transform: [{ translateX }],
          }}
        />
      </Animated.View>
    </Pressable>
  );
}
