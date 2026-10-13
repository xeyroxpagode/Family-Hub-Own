import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { HomePlusIcon } from '../../constants/icons';
import { AppText } from '../../components/ui/AppText';

/**
 * HomeCloud HC-POL-016 — THE ACTIVE FAVORITES FILTER, always stated.
 *
 * The Favoritos toggle lives inside the filter sheet, so a member can forget it
 * is on and then wonder why the browser only shows a few Files. This chip is the
 * permanent, extractable statement of that mode: it is present exactly while the
 * server predicate `favoritesOnly` is narrowing the read, and its ✕ turns the
 * mode off.
 *
 * It occupies its own row instead of riding on the header, so turning the mode
 * on or off never moves the search field, the grid or the tab selector.
 */

export interface FilesFavoritesChipProps {
  visible: boolean;
  count: number | null;
  onClear: () => void;
}

export function FilesFavoritesChip({ visible, count, onClear }: FilesFavoritesChipProps) {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = React.useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: reducedMotion ? 40 : 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return undefined;
    }
    Animated.timing(progress, {
      toValue: 0,
      duration: reducedMotion ? 40 : 150,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setMounted(false));
    return undefined;
  }, [visible, progress, reducedMotion]);

  if (!mounted) return null;

  const summary = count === null ? 'Favoritos' : `${count} ${count === 1 ? 'favorito' : 'favoritos'}`;

  return (
    <Animated.View
      style={[
        styles.row,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }],
        },
      ]}
    >
      <Pressable
        onPress={onClear}
        accessibilityRole="button"
        accessibilityLabel={`Quitar el filtro de favoritos, ${summary}`}
        style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
      >
        <HomePlusIcon name="star" size={14} color={colors.brand} />
        <AppText variant="caption" weight="800" style={styles.label}>
          {summary}
        </AppText>
        <View style={styles.close}>
          <HomePlusIcon name="close" size={13} color={colors.text.secondary} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing[5], paddingBottom: spacing[1] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    height: 34,
    minHeight: 34,
    paddingHorizontal: spacing[3],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: colors.surface.card,
    alignSelf: 'flex-start',
  },
  chipPressed: { opacity: 0.72 },
  label: { color: colors.brand },
  close: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.soft,
  },
});
