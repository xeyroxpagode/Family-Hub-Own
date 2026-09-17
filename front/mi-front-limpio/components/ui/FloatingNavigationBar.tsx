import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  StyleSheet,
  View,
  useColorScheme,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { HomePlusIcon, type HomePlusIconName } from '../../constants/icons';
import { colors, motion, radius, shadows, spacing, touchTargets } from '../../constants/theme';
import { AppText } from './AppText';
import { InteractivePressable } from './InteractivePressable';

export type FloatingNavigationVariant = 'main' | 'section';
export type FloatingNavigationAppearance = 'auto' | 'light' | 'dark';
export type FloatingNavigationDisplay = 'icon-only' | 'icon-label' | 'label-only';
export type FloatingNavigationSize = 'compact' | 'regular';

export const floatingNavigationMetrics = {
  mainRegularHeight: 68,
  mainCompactHeight: 60,
  sectionRegularHeight: 56,
  sectionCompactHeight: 48,
} as const;

export type FloatingNavigationItem = {
  id: string;
  icon: HomePlusIconName;
  label?: string;
  badge?: number;
  isAction?: boolean;
  accessibilityLabel?: string;
};

type NavigationPalette = {
  surface: string;
  border: string;
  icon: string;
  label: string;
  active: string;
  activeIcon: string;
  badge: string;
  badgeText: string;
};

export type NavigationItemProps = {
  item: FloatingNavigationItem;
  active: boolean;
  variant: FloatingNavigationVariant;
  display: FloatingNavigationDisplay;
  palette: NavigationPalette;
  accentColor: string;
  onPress: () => void;
};

/** A single action shared by the main and contextual floating navigation bars. */
export function NavigationItem({
  item,
  active,
  variant,
  display,
  palette,
  accentColor,
  onPress,
}: NavigationItemProps) {
  const showIcon = display !== 'label-only';
  const showLabel = display !== 'icon-only' && Boolean(item.label);
  const iconSize = item.isAction ? 25 : variant === 'main' ? 24 : 20;
  const activeIconColor = item.isAction || active ? palette.activeIcon : palette.icon;

  return (
    <InteractivePressable
      accessibilityRole={item.isAction ? 'button' : 'tab'}
      accessibilityLabel={item.accessibilityLabel ?? item.label ?? item.id}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      haptic={item.isAction ? 'medium' : 'light'}
      pressScale={item.isAction ? 0.94 : motion.scale.tab}
      pressedOpacity={0.84}
      style={[
        styles.item,
        variant === 'section' ? styles.sectionItem : null,
        item.isAction ? styles.actionItem : null,
      ]}
    >
      {showIcon ? (
        <View style={[styles.iconSlot, item.isAction ? [styles.actionSlot, { backgroundColor: accentColor }] : null]}>
          <HomePlusIcon name={item.icon} size={iconSize} color={activeIconColor} />
          {item.badge && item.badge > 0 ? (
            <View style={[styles.badge, { backgroundColor: palette.badge }]}>
              <AppText variant="micro" style={[styles.badgeText, { color: palette.badgeText }]}>
                {item.badge > 99 ? '99+' : String(item.badge)}
              </AppText>
            </View>
          ) : null}
        </View>
      ) : null}
      {showLabel ? (
        <AppText
          variant="caption"
          weight={active ? '700' : '600'}
          style={[styles.label, { color: active ? (display === 'label-only' ? palette.activeIcon : palette.active) : palette.label }]}
          numberOfLines={1}
        >
          {item.label}
        </AppText>
      ) : null}
    </InteractivePressable>
  );
}

export type FloatingNavigationBarProps = {
  items: FloatingNavigationItem[];
  activeId?: string;
  onSelect: (item: FloatingNavigationItem) => void;
  variant?: FloatingNavigationVariant;
  display?: FloatingNavigationDisplay;
  appearance?: FloatingNavigationAppearance;
  size?: FloatingNavigationSize;
  style?: StyleProp<ViewStyle>;
  accentColor?: string;
  activeSurfaceColor?: string;
};

/**
 * Official HomePlus floating navigation system. It supports the app-level
 * navigation bar as well as compact, contextual controls over rich content.
 */
export function FloatingNavigationBar({
  items,
  activeId,
  onSelect,
  variant = 'main',
  display = 'icon-only',
  appearance = 'auto',
  size = 'regular',
  style,
  accentColor = colors.brand,
  activeSurfaceColor = 'rgba(231, 100, 63, 0.78)',
}: FloatingNavigationBarProps) {
  const systemAppearance = useColorScheme();
  const [width, setWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const matchedActiveIndex = items.findIndex((item) => item.id === activeId && !item.isAction);
  const hasActiveItem = matchedActiveIndex >= 0;
  const activeIndex = Math.max(0, matchedActiveIndex);
  const activePosition = useRef(new Animated.Value(activeIndex)).current;
  const resolvedAppearance = appearance === 'auto'
    ? (systemAppearance === 'dark' ? 'dark' : 'light')
    : appearance;
  const palette = useMemo<NavigationPalette>(() => {
    if (resolvedAppearance === 'dark') {
      return {
        surface: 'rgba(37, 34, 31, 0.94)',
        border: 'rgba(247, 245, 242, 0.16)',
        icon: '#D7D0C8',
        label: '#D7D0C8',
        active: accentColor,
        activeIcon: '#FFFFFF',
        badge: '#EE7252',
        badgeText: '#FFFFFF',
      };
    }

    return {
      surface: 'rgba(255, 255, 255, 0.96)',
      border: 'rgba(26, 23, 20, 0.08)',
      icon: colors.text.tertiary,
      label: colors.text.secondary,
      active: accentColor,
      activeIcon: '#FFFFFF',
      badge: colors.danger.base,
      badgeText: '#FFFFFF',
    };
  }, [accentColor, resolvedAppearance]);
  const itemWidth = width > 0
    ? Math.max(0, width - spacing[2]) / Math.max(items.length, 1)
    : 0;
  const barHeight = variant === 'main'
    ? (size === 'compact' ? floatingNavigationMetrics.mainCompactHeight : floatingNavigationMetrics.mainRegularHeight)
    : (size === 'compact' ? floatingNavigationMetrics.sectionCompactHeight : floatingNavigationMetrics.sectionRegularHeight);
  const isSectionPill = variant === 'section' && display === 'label-only';
  const activeSize = variant === 'main'
    ? (size === 'compact' ? 44 : 52)
    : (size === 'compact' ? 36 : 42);
  const activeWidth = isSectionPill ? Math.max(0, itemWidth - spacing[1]) : activeSize;
  const activeHeight = isSectionPill ? (size === 'compact' ? 40 : 46) : activeSize;
  const activeOffset = itemWidth > 0
    ? spacing[1] + (itemWidth - activeWidth) / 2
    : 0;

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      activePosition.setValue(activeIndex);
      return;
    }
    Animated.spring(activePosition, {
      toValue: activeIndex,
      damping: 20,
      stiffness: 260,
      mass: 0.72,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, activePosition, reduceMotion]);

  const translateX = itemWidth > 0
    ? Animated.add(Animated.multiply(activePosition, itemWidth), activeOffset)
    : 0;

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[
        styles.bar,
        { height: barHeight, backgroundColor: palette.surface, borderColor: palette.border },
        variant === 'section' ? styles.sectionBar : null,
        style,
      ]}
    >
      {hasActiveItem && itemWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.activeSurface,
            {
              width: activeWidth,
              height: activeHeight,
              borderRadius: radius.full,
              backgroundColor: activeSurfaceColor,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.32)',
              top: (barHeight - activeHeight) / 2,
              transform: [{ translateX }],
            },
          ]}
        />
      ) : null}
      <View style={styles.itemsRow}>
        {items.map((item) => (
          <NavigationItem
            key={item.id}
            item={item}
            active={item.id === activeId && !item.isAction}
            variant={variant}
            display={display}
            palette={palette}
            accentColor={accentColor}
            onPress={() => onSelect(item)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing[1],
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadows.floating,
  },
  sectionBar: {
    paddingHorizontal: spacing[1],
    ...shadows.shadow2,
  },
  itemsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    flex: 1,
    minWidth: 0,
    minHeight: touchTargets.normal,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    zIndex: 1,
  },
  sectionItem: {
    minHeight: touchTargets.normal,
  },
  iconSlot: {
    width: touchTargets.normal,
    height: touchTargets.normal,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionItem: {
    minHeight: 56,
  },
  actionSlot: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    ...shadows.shadow2,
  },
  activeSurface: {
    position: 'absolute',
    left: 0,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 1,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 9,
    lineHeight: 11,
  },
  label: {
    maxWidth: '100%',
    textAlign: 'center',
  },
});
