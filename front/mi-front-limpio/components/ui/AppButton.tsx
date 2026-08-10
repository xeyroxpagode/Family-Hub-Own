import React from 'react';
import {
  ActivityIndicator,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, motion, radius, spacing, touchTargets } from '../../constants/theme';
import { AppText } from './AppText';
import { InteractivePressable, type InteractionHaptic } from './InteractivePressable';

export type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass' | 'icon';
export type AppButtonSize = 'sm' | 'md' | 'lg';

export type AppButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title?: string;
  children?: React.ReactNode;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  loading?: boolean;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  haptic?: InteractionHaptic;
};

const sizeStyles: Record<
  AppButtonSize,
  { minHeight: number; paddingHorizontal: number; textVariant: 'caption' | 'body' | 'bodyLarge' }
> = {
  sm: { minHeight: touchTargets.normal, paddingHorizontal: spacing[3], textVariant: 'caption' },
  md: { minHeight: touchTargets.normal, paddingHorizontal: spacing[4], textVariant: 'body' },
  lg: { minHeight: 52, paddingHorizontal: spacing[5], textVariant: 'bodyLarge' },
};

const variantStyles: Record<
  AppButtonVariant,
  { container: ViewStyle; textTone: 'primary' | 'inverse' | 'danger' }
> = {
  primary: {
    container: { backgroundColor: colors.terracotta[500], borderColor: colors.terracotta[500] },
    textTone: 'inverse',
  },
  secondary: {
    container: { backgroundColor: colors.terracotta[50], borderColor: colors.terracotta[100] },
    textTone: 'primary',
  },
  ghost: {
    container: { backgroundColor: 'transparent', borderColor: 'transparent' },
    textTone: 'primary',
  },
  danger: {
    container: { backgroundColor: colors.danger.soft, borderColor: colors.danger.base },
    textTone: 'danger',
  },
  glass: {
    container: { backgroundColor: colors.surface.glass, borderColor: colors.border.subtle },
    textTone: 'primary',
  },
  icon: {
    container: { backgroundColor: colors.surface.soft, borderColor: colors.border.subtle },
    textTone: 'primary',
  },
};

export function AppButton({
  title,
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  leftSlot,
  rightSlot,
  accessibilityLabel,
  style,
  textStyle,
  haptic,
  ...props
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const buttonSize = sizeStyles[size];
  const buttonVariant = variantStyles[variant];
  const isIcon = variant === 'icon';
  const buttonContent = (
    <>
      {leftSlot ? <View>{leftSlot}</View> : null}
      {title ? (
        <AppText
          variant={buttonSize.textVariant}
          tone={buttonVariant.textTone}
          weight="700"
          style={textStyle}
        >
          {title}
        </AppText>
      ) : (
        children
      )}
      {rightSlot ? <View>{rightSlot}</View> : null}
    </>
  );

  return (
    <InteractivePressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      {...props}
      haptic={haptic ?? (variant === 'primary' || variant === 'danger' ? 'medium' : variant === 'icon' ? 'light' : 'none')}
      pressScale={isIcon ? motion.scale.icon : motion.scale.button}
      style={[
        {
          minHeight: buttonSize.minHeight,
          minWidth: isIcon ? buttonSize.minHeight : touchTargets.normal,
          paddingHorizontal: isIcon ? 0 : buttonSize.paddingHorizontal,
          paddingVertical: spacing[2],
          borderRadius: isIcon ? radius.pill : radius.lg,
          borderWidth: variant === 'ghost' ? 0 : 1,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing[2],
        },
        buttonVariant.container,
        style,
      ]}
    >
      {loading ? (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ opacity: 0 }}>{buttonContent}</View>
          <ActivityIndicator
            style={{ position: 'absolute' }}
            color={buttonVariant.textTone === 'inverse' ? colors.text.inverse : colors.terracotta[600]}
          />
        </View>
      ) : (
        buttonContent
      )}
    </InteractivePressable>
  );
}
