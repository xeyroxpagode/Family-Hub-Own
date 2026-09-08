import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useAppTheme } from '../../context/AppThemeContext';
import { lightHaptic, mediumHaptic } from '../../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type InteractionHaptic = 'none' | 'light' | 'medium';

export type InteractivePressableProps = Omit<PressableProps, 'children' | 'style'> & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  pressScale?: number;
  pressedOpacity?: number;
  haptic?: InteractionHaptic;
};

export function InteractivePressable({
  children,
  disabled,
  style,
  pressScale,
  pressedOpacity = 0.9,
  haptic = 'none',
  onPressIn,
  onPressOut,
  ...props
}: InteractivePressableProps) {
  const { motion } = useAppTheme();
  const resolvedPressScale = pressScale ?? motion.scale.button;
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);
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

  const handlePressIn: NonNullable<PressableProps['onPressIn']> = (event) => {
    if (!disabled) {
      setPressed(true);
      if (haptic === 'light') void lightHaptic();
      if (haptic === 'medium') void mediumHaptic();
      if (!reduceMotion) {
        Animated.spring(scale, {
          toValue: resolvedPressScale,
          ...motion.spring.press,
          useNativeDriver: true,
        }).start();
      }
    }
    onPressIn?.(event);
  };

  const handlePressOut: NonNullable<PressableProps['onPressOut']> = (event) => {
    setPressed(false);
    if (!reduceMotion) {
      Animated.spring(scale, {
        toValue: 1,
        ...motion.spring.release,
        useNativeDriver: true,
      }).start();
    }
    onPressOut?.(event);
  };

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        style,
        {
          opacity: disabled ? 0.58 : pressed ? pressedOpacity : 1,
          transform: [{ scale }],
        },
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}
