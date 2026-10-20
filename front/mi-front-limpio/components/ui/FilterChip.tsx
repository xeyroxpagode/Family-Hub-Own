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
  onClear?: () => void;
};

export function FilterChip({ label, selected = false, icon, onPress, onClear, disabled = false, style }: FilterChipProps) {
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
      {onClear ? <InteractivePressable accessibilityRole="button" accessibilityLabel={`Quitar filtro ${label}`} onPress={onClear} hitSlop={{ left: 8, right: 4, top: 8, bottom: 8 }} style={{ minWidth: 44, minHeight: 44, marginVertical: -8, marginRight: -8, padding: 4, marginLeft: 4, borderRadius: 999, backgroundColor: selected ? colors.brandSoft : undefined, alignItems: 'center', justifyContent: 'center' }}><HomePlusIcon name="close" size={16} color={selected ? colors.brand : colors.text.tertiary} /></InteractivePressable> : null}
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
