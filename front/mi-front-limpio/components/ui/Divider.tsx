import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '../../constants/theme';

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: colors.border.default }, style]} />;
}
