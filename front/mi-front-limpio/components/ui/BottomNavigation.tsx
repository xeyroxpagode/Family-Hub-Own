import React from 'react';
import { Animated, View, type StyleProp, type ViewStyle } from 'react-native';

import { HomePlusIcon, type HomePlusIconName } from '../../constants/icons';
import { colors, componentSizes, iconSizes, motion, radius, shadows, spacing } from '../../constants/theme';

export type BottomNavigationIconProps = {
  icon: HomePlusIconName;
  focused: boolean;
};

export function BottomNavigationIcon({ icon, focused }: BottomNavigationIconProps) {
  const scale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.timing(scale, {
      toValue: focused ? 1.04 : 1,
      duration: motion.navActive,
      useNativeDriver: true,
    }).start();
  }, [focused, scale]);

  return (
    <View style={{ flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          width: componentSizes.bottomNavActiveItem,
          height: componentSizes.bottomNavActiveItem,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: focused ? colors.brandSoft : 'transparent',
          transform: [{ scale }],
        }}
      >
        <HomePlusIcon
          name={icon}
          size={iconSizes.navbar}
          color={focused ? colors.brand : colors.text.tertiary}
        />
      </Animated.View>
    </View>
  );
}

export function FloatingActionButton({
  icon = 'add',
  style,
}: {
  icon?: HomePlusIconName;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          width: componentSizes.fab,
          height: componentSizes.fab,
          borderRadius: radius.full,
          backgroundColor: colors.brand,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 3,
          borderColor: colors.surface.card,
          ...shadows.shadow3,
        },
        style,
      ]}
    >
      <HomePlusIcon name={icon} size={28} color={colors.text.inverse} />
    </View>
  );
}

export const bottomNavigationStyle = (bottomInset: number): ViewStyle => ({
  position: 'absolute',
  left: spacing[4],
  right: spacing[4],
  bottom: Math.max(bottomInset, spacing[3]),
  height: componentSizes.bottomNavHeight,
  paddingHorizontal: spacing[2],
  paddingTop: 0,
  paddingBottom: 0,
  borderRadius: radius.xxl,
  borderTopWidth: 0,
  borderWidth: 1,
  borderColor: colors.border.default,
  backgroundColor: colors.surface.card,
  ...shadows.shadow3,
});
