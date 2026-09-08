import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '../../context/AppThemeContext';

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useAppTheme();
  return <View style={[{ height: 1, backgroundColor: colors.border.default }, style]} />;
}
