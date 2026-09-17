import React from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';

import { HomePlusIcon, type HomePlusIconName } from '../../constants/icons';
import { colors, iconSizes, motion, radius, touchTargets } from '../../constants/theme';
import { InteractivePressable, type InteractionHaptic } from './InteractivePressable';

export type IconButtonVariant = 'plain' | 'surface' | 'brandSoft' | 'dangerSoft';

export type IconButtonProps = {
  icon: HomePlusIconName;
  accessibilityLabel: string;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  variant?: IconButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  haptic?: InteractionHaptic;
  children?: React.ReactNode;
};

const variantStyle: Record<IconButtonVariant, { backgroundColor: string; color: string; borderColor: string }> = {
  plain: {
    backgroundColor: 'transparent',
    color: colors.text.primary,
    borderColor: 'transparent',
  },
  surface: {
    backgroundColor: colors.surface.card,
    color: colors.text.primary,
    borderColor: colors.border.default,
  },
  brandSoft: {
    backgroundColor: colors.brandSoft,
    color: colors.brand,
    borderColor: colors.border.default,
  },
  dangerSoft: {
    backgroundColor: colors.danger.soft,
    color: colors.danger.base,
    borderColor: colors.border.default,
  },
};

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  size = touchTargets.normal,
  iconSize = iconSizes.header,
  variant = 'surface',
  disabled = false,
  style,
  haptic = 'light',
  children,
}: IconButtonProps) {
  const visual = variantStyle[variant];

  return (
    <InteractivePressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      haptic={haptic}
      pressScale={motion.scale.icon}
      pressedOpacity={0.85}
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: visual.backgroundColor,
          borderColor: visual.borderColor,
          borderWidth: variant === 'plain' ? 0 : 1,
        },
        style,
      ]}
    >
      <HomePlusIcon name={icon} size={iconSize} color={disabled ? colors.text.disabled : visual.color} />
      {children}
    </InteractivePressable>
  );
}
