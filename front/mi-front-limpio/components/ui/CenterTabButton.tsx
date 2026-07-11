import React, { useState, useCallback } from 'react';
import { Animated, Pressable, View, StyleSheet } from 'react-native';
import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, spacing, shadows, touchTargets } from '../../constants/theme';
import type { QuickActionSheetProps } from './QuickActionSheet';

export type CenterTabButtonProps = {
  onPress: () => void;
};

export function CenterTabButton({ onPress }: CenterTabButtonProps) {
  const [pressed, setPressed] = useState(false);
  const scale = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    setPressed(true);
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: true,
      tension: 400,
      friction: 7,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    setPressed(false);
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 400,
      friction: 7,
    }).start();
    onPress();
  }, [onPress, scale]);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.button,
          {
            opacity: pressed ? 0.86 : 1,
            transform: [{ scale: pressed ? 0.92 : 1 }],
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Acciones rápidas"
      >
        <Animated.View style={[styles.iconWrapper, { transform: [{ scale }] }]}>
          <HomePlusIcon name="add" size={32} color={colors.terracotta[600]} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    top: -20,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.terracotta[500],
    ...shadows.floating,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.terracotta[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
});