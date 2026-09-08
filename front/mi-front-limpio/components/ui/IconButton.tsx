import React from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';

import { HomePlusIcon, type HomePlusIconName } from '../../constants/icons';
import { type ColorTokens } from '../../constants/theme';
import { useAppTheme } from '../../context/AppThemeContext';
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

const getVariantStyle = (colors: ColorTokens): Record<IconButtonVariant, { backgroundColor: string; color: string; borderColor: string }> => ({
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
});

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  size,
  iconSize,
  variant = 'surface',
  disabled = false,
  style,
  haptic = 'light',
  children,
}: IconButtonProps) {
  const theme = useAppTheme();
  const { colors, iconSizes, motion, radius, touchTargets } = theme;
  const resolvedSize = size ?? touchTargets.normal;
  const resolvedIconSize = iconSize ?? iconSizes.header;
  const visual = getVariantStyle(colors)[variant];

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
          width: resolvedSize,
          height: resolvedSize,
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
      <HomePlusIcon name={icon} size={resolvedIconSize} color={disabled ? colors.text.disabled : visual.color} />
      {children}
    </InteractivePressable>
  );
}
