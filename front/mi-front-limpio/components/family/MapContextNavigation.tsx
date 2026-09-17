import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { HomePlusIcon, type HomePlusIconName } from '../../constants/icons';
import { colors, radius, shadows, spacing, touchTargets } from '../../constants/theme';
import { InteractivePressable } from '../ui';
import type { MapContextCardMode } from './MapContextCard';

export const mapContextNavigationHeight = 52;

type MapContextNavigationItem = {
  id: MapContextCardMode;
  icon: HomePlusIconName;
  label: string;
};

type MapContextNavigationProps = {
  activeItem: MapContextCardMode | null;
  onSelect: (item: MapContextCardMode) => void;
};

const ITEMS: readonly MapContextNavigationItem[] = [
  { id: 'members', icon: 'people-outline', label: 'Integrantes' },
  { id: 'places', icon: 'location-outline', label: 'Lugares' },
  { id: 'self', icon: 'person-outline', label: 'Yo' },
];

const ITEM_SIZE = touchTargets.normal;
const BAR_PADDING = spacing[1];
const ITEM_GAP = spacing[1];
const NAVIGATION_WIDTH = (ITEM_SIZE * ITEMS.length) + (ITEM_GAP * (ITEMS.length - 1)) + (BAR_PADDING * 2);

/**
 * Stable map-specific navigation: the three icon targets never change size or
 * position. Only the glass indicator moves between their fixed positions.
 */
export function MapContextNavigation({ activeItem, onSelect }: MapContextNavigationProps) {
  const getIndex = (item: MapContextCardMode | null) => ITEMS.findIndex((entry) => entry.id === item);
  const initialIndex = Math.max(0, getIndex(activeItem));
  const activePosition = useRef(new Animated.Value(initialIndex)).current;
  const indicatorOpacity = useRef(new Animated.Value(activeItem ? 1 : 0)).current;
  const runningAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const previousActiveItem = useRef<MapContextCardMode | null>(activeItem);
  const [indicatorVisible, setIndicatorVisible] = useState(activeItem !== null);

  useEffect(() => {
    const nextIndex = getIndex(activeItem);
    const hadActiveItem = previousActiveItem.current !== null;

    runningAnimation.current?.stop();

    if (nextIndex < 0) {
      const fadeOut = Animated.timing(indicatorOpacity, {
        toValue: 0,
        duration: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      });
      runningAnimation.current = fadeOut;
      fadeOut.start(({ finished }) => {
        if (finished && runningAnimation.current === fadeOut) {
          setIndicatorVisible(false);
          runningAnimation.current = null;
        }
      });
    } else {
      setIndicatorVisible(true);
      if (!hadActiveItem) activePosition.setValue(nextIndex);

      const animation = Animated.parallel([
        Animated.timing(activePosition, {
          toValue: nextIndex,
          duration: hadActiveItem ? 180 : 0,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(indicatorOpacity, {
          toValue: 1,
          duration: hadActiveItem ? 120 : 0,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ], { stopTogether: true });
      runningAnimation.current = animation;
      animation.start(({ finished }) => {
        if (finished && runningAnimation.current === animation) runningAnimation.current = null;
      });
    }

    previousActiveItem.current = activeItem;

    return () => {
      runningAnimation.current?.stop();
    };
  }, [activeItem, activePosition, indicatorOpacity]);

  const activeTranslateX = activePosition.interpolate({
    inputRange: ITEMS.map((_, index) => index),
    outputRange: ITEMS.map((_, index) => index * (ITEM_SIZE + ITEM_GAP)),
  });

  return (
    <View accessibilityRole="tablist" style={styles.navigation}>
      {indicatorVisible ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.activeSurface,
            { opacity: indicatorOpacity, transform: [{ translateX: activeTranslateX }] },
          ]}
        />
      ) : null}

      <View style={styles.itemsRow}>
        {ITEMS.map((item) => {
          const active = item.id === activeItem;

          return (
            <InteractivePressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(item.id)}
              haptic="light"
              pressScale={0.96}
              style={styles.item}
            >
              <HomePlusIcon
                name={item.icon}
                size={21}
                color={active ? colors.brand : colors.text.tertiary}
              />
            </InteractivePressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navigation: {
    width: NAVIGATION_WIDTH,
    height: mapContextNavigationHeight,
    alignSelf: 'center',
    padding: BAR_PADDING,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
    ...shadows.shadow2,
  },
  itemsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ITEM_GAP,
  },
  item: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  activeSurface: {
    position: 'absolute',
    top: BAR_PADDING,
    left: BAR_PADDING,
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: radius.full,
    backgroundColor: 'rgba(231, 100, 63, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(231, 100, 63, 0.24)',
    shadowColor: colors.shadow.soft,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
});
