import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, glass, radius, shadows, type RadiusToken } from '../../constants/theme';

export type GlassSurfaceProps = {
  children: React.ReactNode;
  intensity?: keyof typeof glass;
  fallback?: 'solid' | 'translucent';
  radiusToken?: RadiusToken;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export function GlassSurface({
  children,
  intensity = 'warm',
  fallback = 'translucent',
  radiusToken = 'xl',
  style,
  contentStyle,
}: GlassSurfaceProps) {
  const glassToken = glass[intensity];
  const backgroundColor = fallback === 'solid' ? colors.surface.soft : glassToken.backgroundColor;

  return (
    <View
      style={[
        {
          backgroundColor,
          borderColor: glassToken.borderColor,
          borderWidth: 1,
          borderRadius: radius[radiusToken],
          overflow: 'hidden',
          ...shadows.floating,
        },
        style,
      ]}
    >
      <View style={contentStyle}>{children}</View>
    </View>
  );
}
