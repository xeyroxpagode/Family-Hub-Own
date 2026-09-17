import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';

export type SkeletonVariant =
  | 'line'
  | 'paragraph'
  | 'card'
  | 'listItem'
  | 'avatar'
  | 'button'
  | 'screenSection';

export type SkeletonProps = {
  variant?: SkeletonVariant;
  width?: number | `${number}%`;
  height?: number;
  lines?: number;
  style?: StyleProp<ViewStyle>;
};

const baseColor = colors.background.alt;

export function Skeleton({
  variant = 'line',
  width,
  height,
  lines = 3,
  style,
}: SkeletonProps) {
  if (variant === 'paragraph') {
    return (
      <View style={[{ gap: spacing[2], width: width ?? '100%' }, style]}>
        {Array.from({ length: lines }).map((_, index) => (
          <View
            key={index}
            style={{
              height: height ?? 14,
              width: index === lines - 1 ? '72%' : '100%',
              borderRadius: radius.pill,
              backgroundColor: baseColor,
            }}
          />
        ))}
      </View>
    );
  }

  if (variant === 'listItem') {
    return (
      <View style={[{ flexDirection: 'row', gap: spacing[3], alignItems: 'center' }, style]}>
        <Skeleton variant="avatar" />
        <View style={{ flex: 1, gap: spacing[2] }}>
          <Skeleton variant="line" />
          <Skeleton variant="line" width="62%" height={12} />
        </View>
      </View>
    );
  }

  if (variant === 'screenSection') {
    return (
      <View style={[{ gap: spacing[4], width: width ?? '100%' }, style]}>
        <Skeleton variant="line" width="48%" height={20} />
        <Skeleton variant="card" />
        <Skeleton variant="card" height={88} />
      </View>
    );
  }

  const variantStyle: Record<Exclude<SkeletonVariant, 'paragraph' | 'listItem' | 'screenSection'>, ViewStyle> = {
    line: {
      height: height ?? 16,
      width: width ?? '100%',
      borderRadius: radius.pill,
    },
    card: {
      height: height ?? 116,
      width: width ?? '100%',
      borderRadius: radius.xl,
    },
    avatar: {
      height: height ?? 44,
      width: width ?? 44,
      borderRadius: radius.pill,
    },
    button: {
      height: height ?? 44,
      width: width ?? 132,
      borderRadius: radius.lg,
    },
  };

  return <View style={[{ backgroundColor: baseColor }, variantStyle[variant], style]} />;
}
