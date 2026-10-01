import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, motion, spacing, touchTargets } from '../../constants/theme';
import { AppText } from './AppText';
import { InteractivePressable } from './InteractivePressable';

export type RowProps = {
  title: string;
  subtitle?: string;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function Row({ title, subtitle, leftSlot, rightSlot, onPress, style }: RowProps) {
  const content = (
    <View
      style={[
        {
          minHeight: touchTargets.normal,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[3],
          paddingVertical: spacing[2],
          borderBottomWidth: 1,
          borderBottomColor: colors.border.subtle,
        },
        style,
      ]}
    >
      {leftSlot}
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="bodySmall" weight="600" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="tertiary" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {rightSlot}
    </View>
  );

  if (!onPress) return content;

  return (
    <InteractivePressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      onPress={onPress}
      haptic="light"
      pressScale={motion.scale.card}
      pressedOpacity={0.85}
    >
      {content}
    </InteractivePressable>
  );
}
