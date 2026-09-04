import React from 'react';
import { View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { colors, motion, radius, spacing, touchTargets } from '../../constants/theme';
import { AppText } from './AppText';
import { InteractivePressable } from './InteractivePressable';

export type ActionPillTone = 'default' | 'primary' | 'success' | 'warning';

export type ActionPillProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  tone?: ActionPillTone;
  selected?: boolean;
  leftSlot?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const toneStyles: Record<
  ActionPillTone,
  { backgroundColor: string; borderColor: string; textTone: 'primary' | 'brand' | 'success' | 'warning' }
> = {
  default: {
    backgroundColor: colors.surface.soft,
    borderColor: colors.border.default,
    textTone: 'primary',
  },
  primary: {
    backgroundColor: colors.terracotta[50],
    borderColor: colors.terracotta[300],
    textTone: 'brand',
  },
  success: {
    backgroundColor: colors.success.soft,
    borderColor: colors.success.base,
    textTone: 'success',
  },
  warning: {
    backgroundColor: colors.warning.soft,
    borderColor: colors.warning.base,
    textTone: 'warning',
  },
};

export function ActionPill({
  label,
  tone = 'default',
  selected = false,
  disabled,
  leftSlot,
  accessibilityLabel,
  style,
  ...props
}: ActionPillProps) {
  const resolvedTone = selected ? 'primary' : tone;
  const toneStyle = toneStyles[resolvedTone];
  const isDisabled = Boolean(disabled);

  return (
    <InteractivePressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled: isDisabled }}
      disabled={isDisabled}
      {...props}
      haptic="light"
      pressScale={motion.scale.button}
      pressedOpacity={0.88}
      style={[
        {
          minHeight: touchTargets.normal,
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[2],
          borderRadius: radius.pill,
          borderWidth: selected ? 2 : 1,
          backgroundColor: toneStyle.backgroundColor,
          borderColor: toneStyle.borderColor,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing[2],
        },
        style,
      ]}
    >
      {leftSlot ? <View>{leftSlot}</View> : null}
      <AppText variant="micro" tone={toneStyle.textTone} weight="700">
        {label}
      </AppText>
    </InteractivePressable>
  );
}
