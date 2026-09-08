import React from 'react';
import { View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { type ColorTokens, type ShadowTokens } from '../../constants/theme';
import { useAppTheme } from '../../context/AppThemeContext';
import { InteractivePressable } from './InteractivePressable';

export type AppCardVariant =
  | 'default'
  | 'elevated'
  | 'glass'
  | 'quiet'
  | 'danger'
  | 'success'
  | 'warning';

export type AppCardProps = {
  children: React.ReactNode;
  variant?: AppCardVariant;
  padding?: 'compact' | 'default' | 'generous';
  highlighted?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  onPress?: PressableProps['onPress'];
  accessibilityLabel?: string;
};

const getVariantStyles = (colors: ColorTokens, shadows: ShadowTokens): Record<AppCardVariant, ViewStyle> => ({
  default: {
    backgroundColor: colors.surface.card,
    borderColor: colors.border.subtle,
    ...shadows.shadow1,
  },
  elevated: {
    backgroundColor: colors.surface.elevated,
    borderColor: colors.border.subtle,
    ...shadows.shadow2,
  },
  glass: {
    backgroundColor: colors.surface.glass,
    borderColor: colors.border.subtle,
    ...shadows.shadow3,
  },
  quiet: {
    backgroundColor: colors.surface.soft,
    borderColor: colors.border.default,
    ...shadows.none,
  },
  danger: {
    backgroundColor: colors.danger.soft,
    borderColor: colors.danger.base,
    ...shadows.shadow1,
  },
  success: {
    backgroundColor: colors.success.soft,
    borderColor: colors.success.base,
    ...shadows.shadow1,
  },
  warning: {
    backgroundColor: colors.warning.soft,
    borderColor: colors.warning.base,
    ...shadows.shadow1,
  },
});

export function AppCard({
  children,
  variant = 'default',
  padding = 'default',
  highlighted = false,
  style,
  contentStyle,
  onPress,
  accessibilityLabel,
}: AppCardProps) {
  const theme = useAppTheme();
  const { colors, motion, radius, shadows, spacing } = theme;
  const paddingValues = {
    compact: spacing[3],
    default: spacing[4],
    generous: spacing[5],
  } as const;
  const variantStyles = getVariantStyles(colors, shadows);
  const cardStyle: StyleProp<ViewStyle> = [
    {
      borderRadius: radius.lg,
      borderWidth: 1,
      overflow: 'hidden',
    },
    variantStyles[variant],
    style,
  ];

  const inner = (
    <View
      style={[
        {
          padding: paddingValues[padding],
          borderLeftWidth: highlighted ? 4 : 0,
          borderLeftColor: highlighted ? colors.terracotta[500] : 'transparent',
        },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  if (!onPress) {
    return <View style={cardStyle}>{inner}</View>;
  }

  return (
    <InteractivePressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      haptic="light"
      pressScale={motion.scale.card}
      pressedOpacity={0.94}
      style={[
        cardStyle,
      ]}
    >
      {inner}
    </InteractivePressable>
  );
}
