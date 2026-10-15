import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomePlusIcon } from '../../constants/icons';
import { useAppTheme } from '../../context/AppThemeContext';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { selectionHaptic, warningHaptic } from '../../utils/plannerHaptics';
import { AppText } from '../ui/AppText';
import { InteractivePressable } from '../ui/InteractivePressable';

export type PlannerAnchoredMenuItem = {
  readonly label: string;
  readonly hint?: string;
  readonly onPress: () => void;
  readonly icon?: string;
  readonly checked?: boolean;
  readonly danger?: boolean;
  readonly separatorBefore?: boolean;
  readonly disabled?: boolean;
  readonly accessibilityLabel?: string;
};

type PlannerAnchoredMenuProps = {
  readonly visible: boolean;
  readonly anchorRef: React.RefObject<View | null>;
  readonly items: readonly PlannerAnchoredMenuItem[];
  readonly onRequestClose: () => void;
  readonly keepOpen?: boolean;
  readonly preferredSide?: 'left' | 'right' | 'auto';
};

type AnchorLayout = { x: number; y: number; width: number; height: number };

const MENU_WIDTH = 208;
const ITEM_HEIGHT = 44;
const VIEWPORT_MARGIN = 12;
const ANCHOR_GAP = 8;
const OPEN_MS = 140;
const CLOSE_MS = 110;

export function PlannerAnchoredMenu({ visible, anchorRef, items, onRequestClose, keepOpen = false, preferredSide = 'auto' }: PlannerAnchoredMenuProps) {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { colors } = useAppTheme();
  const [mounted, setMounted] = useState(false);
  const [anchorLayout, setAnchorLayout] = useState<AnchorLayout | null>(null);
  const generationRef = useRef(0);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.98)).current;
  const translateY = useRef(new Animated.Value(2)).current;

  useEffect(() => {
    generationRef.current += 1;
    const generation = generationRef.current;
    if (!visible) {
      if (!mounted) { setAnchorLayout(null); return; }
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: reduceMotion ? 80 : CLOSE_MS, easing: Easing.bezier(0.4, 0, 1, 1), useNativeDriver: true }),
        Animated.timing(scale, { toValue: reduceMotion ? 1 : 0.98, duration: reduceMotion ? 80 : CLOSE_MS, easing: Easing.bezier(0.4, 0, 1, 1), useNativeDriver: true }),
      ]).start(() => {
        if (generationRef.current !== generation) return;
        setMounted(false);
        setAnchorLayout(null);
      });
      return;
    }

    const anchor = anchorRef.current;
    if (!anchor) { setAnchorLayout(null); onRequestClose(); return; }
    anchor.measureInWindow((x, y, width, height) => {
      if (generationRef.current !== generation || !visible || !anchorRef.current || width <= 0 || height <= 0) return;
      setAnchorLayout({ x, y, width, height });
      setMounted(true);
      opacity.setValue(0);
      scale.setValue(reduceMotion ? 1 : 0.98);
      translateY.setValue(reduceMotion ? 0 : 2);
      if (generationRef.current !== generation) return;
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: reduceMotion ? 80 : OPEN_MS, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: reduceMotion ? 80 : OPEN_MS, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: reduceMotion ? 80 : OPEN_MS, easing: Easing.bezier(0.2, 0, 0, 1), useNativeDriver: true }),
      ]).start();
    });
  }, [anchorRef, mounted, onRequestClose, opacity, reduceMotion, scale, translateY, visible]);

  const geometry = useMemo(() => {
    if (!anchorLayout) return { left: VIEWPORT_MARGIN, top: insets.top + VIEWPORT_MARGIN };
    const separatorCount = items.filter((item) => item.separatorBefore).length;
    const estimatedHeight = Math.max(ITEM_HEIGHT + 12, items.length * ITEM_HEIGHT + separatorCount + 12);
    const minTop = insets.top + VIEWPORT_MARGIN;
    const maxTop = Math.max(minTop, viewportHeight - insets.bottom - VIEWPORT_MARGIN - estimatedHeight);
    const alignLeft = anchorLayout.x + anchorLayout.width - MENU_WIDTH;
    const alignRight = anchorLayout.x;
    const wantsLeft = preferredSide === 'left' || (preferredSide === 'auto' && alignRight + MENU_WIDTH > viewportWidth - VIEWPORT_MARGIN);
    const rawLeft = wantsLeft ? alignLeft : alignRight;
    const left = Math.max(VIEWPORT_MARGIN, Math.min(rawLeft, viewportWidth - MENU_WIDTH - VIEWPORT_MARGIN));
    const below = anchorLayout.y + anchorLayout.height + ANCHOR_GAP;
    const above = anchorLayout.y - ANCHOR_GAP - estimatedHeight;
    const rawTop = below + estimatedHeight <= viewportHeight - insets.bottom - VIEWPORT_MARGIN ? below : above;
    return { left, top: Math.max(minTop, Math.min(rawTop, maxTop)) };
  }, [anchorLayout, insets.bottom, insets.top, items, preferredSide, viewportHeight, viewportWidth]);

  if (!mounted) return null;
  if (!anchorLayout) return null;

  return (
    <Modal visible transparent animationType="none" presentationStyle="overFullScreen" statusBarTranslucent onRequestClose={onRequestClose}>
      <View style={styles.overlay} pointerEvents="box-none">
        <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose} accessibilityRole="button" accessibilityLabel="Cerrar menú" importantForAccessibility="no" />
        <Animated.View style={[styles.menu, { left: geometry.left, top: geometry.top, width: MENU_WIDTH, opacity, transform: [{ translateY }, { scale }] }]} accessibilityRole="menu" accessibilityViewIsModal>
          <View style={styles.menuInner}>
            {items.map((item, index) => (
              <React.Fragment key={`${index}-${item.label}`}>
                {item.separatorBefore ? <View style={[styles.separator, { marginLeft: item.icon ? 42 : 14 }]} /> : null}
                <PlannerAnchoredMenuItemComponent
                  item={item}
                  colors={colors}
                  onPress={() => {
                    if (item.disabled) return;
                    if (item.danger) warningHaptic(); else selectionHaptic();
                    item.onPress();
                    if (!keepOpen) onRequestClose();
                  }}
                />
              </React.Fragment>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function PlannerAnchoredMenuItemComponent({ item, colors, onPress }: { readonly item: PlannerAnchoredMenuItem; readonly colors: ReturnType<typeof useAppTheme>['colors']; readonly onPress: () => void }) {
  return (
    <InteractivePressable
      style={styles.item}
      onPress={onPress}
      disabled={item.disabled}
      accessibilityRole="menuitem"
      accessibilityState={{ selected: item.checked, disabled: item.disabled }}
      accessibilityLabel={item.accessibilityLabel ?? item.label}
    >
      {item.icon || item.checked !== undefined ? (
        <View style={styles.iconSlot}>
          <HomePlusIcon name={(item.checked ? 'checkmark' : item.icon) as any} size={18} color={item.danger ? colors.danger.base : colors.text.secondary} />
        </View>
      ) : null}
      <View style={styles.textContent}>
        <AppText variant="body" weight="500" style={[styles.labelText, item.danger && { color: colors.danger.base }]} disabled={item.disabled}>{item.label}</AppText>
        {item.hint ? <AppText variant="caption" tone="secondary" disabled={item.disabled}>{item.hint}</AppText> : null}
      </View>
    </InteractivePressable>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26,23,20,0.05)' } as any,
  menu: { position: 'absolute', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: '#EEE8E0', backgroundColor: '#FFFFFF', shadowColor: '#1A1714', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 16, elevation: 8, overflow: 'hidden' },
  menuInner: { paddingVertical: 6 },
  item: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemPressed: { backgroundColor: '#F4F0EB' },
  iconSlot: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  textContent: { flex: 1 },
  labelText: { color: '#1A1714', fontSize: 15, fontWeight: '500' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#EEE8E0', marginRight: 14 },
});
