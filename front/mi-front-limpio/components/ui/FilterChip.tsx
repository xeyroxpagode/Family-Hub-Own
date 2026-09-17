import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { HomePlusIcon, type HomePlusIconName } from '../../constants/icons';
import { colors, componentSizes, iconSizes, motion, radius, spacing } from '../../constants/theme';
import { AppText } from './AppText';
import { InteractivePressable } from './InteractivePressable';

export type FilterChipProps = {
  label: string;
  selected?: boolean;
  icon?: HomePlusIconName;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function FilterChip({ label, selected = false, icon, onPress, disabled = false, style }: FilterChipProps) {
  const content = (
    <View
      style={[
        {
          minHeight: componentSizes.filterChipHeight,
          paddingHorizontal: spacing[3],
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: selected ? colors.brand : colors.border.default,
          backgroundColor: selected ? colors.brandSoft : colors.surface.card,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing[2],
          opacity: disabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      {icon ? <HomePlusIcon name={icon} size={iconSizes.small} color={selected ? colors.brand : colors.text.tertiary} /> : null}
      <AppText variant="bodySmall" weight="500" style={{ color: selected ? colors.brand : colors.text.secondary }}>
        {label}
      </AppText>
    </View>
  );

  if (!onPress) return content;

  return (
    <InteractivePressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      haptic="light"
      pressScale={motion.scale.button}
      pressedOpacity={0.85}
    >
      {content}
    </InteractivePressable>
  );
}
