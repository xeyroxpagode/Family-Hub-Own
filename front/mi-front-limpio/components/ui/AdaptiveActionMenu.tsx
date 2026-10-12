import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MOTION } from '../../constants/theme';
import { useAppTheme } from '../../context/AppThemeContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { resolveAdaptiveMenuLayout, type MenuAnchor } from '../../services/homecloud/adaptiveActionMenuLayout';
import { ActionSheet } from './ActionSheet';
import { AppText } from './AppText';

export type { MenuAnchor } from '../../services/homecloud/adaptiveActionMenuLayout';

export function menuAnchorFromEvent(event: GestureResponderEvent, size = 44): MenuAnchor {
  return {
    x: event.nativeEvent.pageX - size / 2,
    y: event.nativeEvent.pageY - size / 2,
    width: size,
    height: size,
  };
}

export function AdaptiveActionMenu({
  visible,
  title,
  anchor,
  itemCount,
  onRequestClose,
  closeDisabled = false,
  children,
  width = 280,
}: {
  visible: boolean;
  title: string;
  anchor: MenuAnchor | null;
  itemCount: number;
  onRequestClose: () => void;
  closeDisabled?: boolean;
  children: React.ReactNode;
  width?: number;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth, height: viewportHeight, fontScale } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  const estimatedHeight = Math.min(520, 64 + itemCount * Math.max(48, 48 * fontScale));
  const menuHeight = measuredHeight ?? estimatedHeight;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(reducedMotion ? 1 : 0.97)).current;

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => setKeyboardHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const layout = useMemo(() => resolveAdaptiveMenuLayout({
    anchor,
    viewportWidth,
    viewportHeight,
    safeTop: insets.top,
    safeBottom: insets.bottom,
    keyboardHeight,
    menuWidth: Math.min(width, viewportWidth - 24),
    menuHeight,
    fontScale,
    itemCount,
  }), [anchor, fontScale, insets.bottom, insets.top, itemCount, keyboardHeight, menuHeight, viewportHeight, viewportWidth, width]);

  useEffect(() => {
    if (visible) setMeasuredHeight(null);
  }, [itemCount, visible]);

  useEffect(() => {
    if (!visible || layout.presentation !== 'popover' || measuredHeight === null) return;
    opacity.setValue(0);
    scale.setValue(reducedMotion ? 1 : 0.97);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: reducedMotion ? MOTION.reducedFade : MOTION.state, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: reducedMotion ? 0 : MOTION.state, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [layout.presentation, measuredHeight, opacity, reducedMotion, scale, visible]);

  const requestAnimatedClose = () => {
    if (closeDisabled) return;
    if (reducedMotion) {
      onRequestClose();
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: MOTION.stateExit, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.99, duration: MOTION.stateExit, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) onRequestClose(); });
  };

  if (layout.presentation === 'sheet') {
    return <ActionSheet visible={visible} title={title} onRequestClose={onRequestClose} closeDisabled={closeDisabled} size="scrollable-content"><ScrollView contentContainerStyle={styles.list}>{children}</ScrollView></ActionSheet>;
  }

  const menuWidth = Math.min(width, viewportWidth - 24);
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={requestAnimatedClose} statusBarTranslucent>
      <View style={styles.overlay} pointerEvents="box-none">
        <Pressable style={StyleSheet.absoluteFill} onPress={requestAnimatedClose} disabled={closeDisabled} accessibilityRole="button" accessibilityLabel={`Cerrar ${title}`} />
        <Animated.View
          accessibilityViewIsModal
          onLayout={(event) => setMeasuredHeight(event.nativeEvent.layout.height)}
          style={[
            styles.popover,
            {
              left: layout.left,
              top: layout.top,
              width: menuWidth,
              maxHeight: viewportHeight - insets.top - insets.bottom - keyboardHeight - 24,
              backgroundColor: theme.colors.background.base,
              borderColor: theme.colors.border.subtle,
              opacity,
              transform: [
                { translateX: layout.originX - menuWidth / 2 },
                { translateY: layout.originY - menuHeight / 2 },
                { scale },
                { translateX: -(layout.originX - menuWidth / 2) },
                { translateY: -(layout.originY - menuHeight / 2) },
              ],
            },
            theme.shadows.floating,
          ]}
        >
          <AppText variant="bodySmall" weight="700" numberOfLines={1} style={styles.title}>{title}</AppText>
          <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  popover: { position: 'absolute', borderWidth: 1, borderRadius: 18, padding: 12, overflow: 'hidden' },
  title: { paddingHorizontal: 8, paddingVertical: 6 },
  list: { gap: 8 },
});
