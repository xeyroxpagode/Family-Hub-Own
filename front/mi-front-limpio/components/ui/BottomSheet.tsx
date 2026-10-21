/**
 * Canonical interactive bottom sheet.
 *
 * ONE primitive, THREE presets (`compact`, `standard`, `flow`). They are not
 * three components: they are detent presets of this sheet.
 *
 * Contract source:
 * `docs/implementation/inventory/v2/03_INVENTORY_PREMIUM_UX_FREEZE.md` §4
 * (BOTTOM SHEET CONTRACT), §5 (KEYBOARD CONTRACT), §6 (MOTION CONTRACT),
 * §7 (REDUCED MOTION) and §10 (OVERLAY CONTRACT).
 *
 * Guarantees:
 * - the grabber is ALWAYS visible, ALWAYS interactive and has a >= 44 px touch
 *   area; it is the drag handle and never decoration;
 * - the sheet follows the finger 1:1 while it is held;
 * - a release always snaps to a detent: position + direction + velocity decide;
 * - the sheet never rests at an arbitrary height;
 * - rubber-band resists past the limits and never invades the unsafe top area;
 * - a dirty sheet moves freely between detents and refuses to dismiss;
 * - a committing sheet cannot be dragged, dismissed or closed;
 * - the keyboard NEVER moves the sheet: the top anchor stays stable, the
 *   internal viewport is recalculated and the footer stays above the keyboard;
 * - the primitive never imposes autofocus.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Animated,
  Keyboard,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomePlusIcon } from '../../constants/icons';
import { MOTION_CURVES, PREMIUM_MOTION, resolveMotionDuration } from '../../constants/motionSystem';
import { colors, radius, spacing } from '../../constants/theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  applyRubberBand,
  closestDetentIndex,
  resolveDismissIntent,
  resolveKeyboardDetentIndex,
  resolveSettledDetentIndex,
  resolveSheetDetents,
  type SheetDetentPreset,
} from '../../services/core/sheetDetents';
import { registerOverlay } from '../../services/core/overlayRegistry';
import { AppText } from './AppText';
import { AppButton } from './AppButton';

export type { SheetDetentPreset };

export type BottomSheetProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onRequestClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Detent preset. Defaults to `standard`. */
  variant?: SheetDetentPreset;
  /** Explicit detent heights (px). Overrides the preset when provided. */
  detentHeights?: number[];
  /** Detent the sheet opens at. Defaults to the preset default. */
  initialDetentIndex?: number;
  /** Called every time the sheet settles on a detent. */
  onDetentChange?: (index: number) => void;
  /** The sheet holds unsaved work: it refuses to dismiss and asks instead. */
  dirty?: boolean;
  /** Invoked when a dismissal is attempted on a dirty sheet. */
  onRequestDismissGuard?: () => void;
  /** A critical operation is in flight: drag, backdrop dismiss and back are disabled. */
  committing?: boolean;
  /** The body owns its own scroll container (a list, a map...). */
  scrollable?: boolean;
  /** Extra separation kept above the near-full detent. */
  topGap?: number;
  /** Extra offset added to the minimum detent height (content-driven minimum). */
  minimumHeight?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
};

const DEFAULT_INITIAL_DETENT: Record<SheetDetentPreset, number> = {
  compact: 0,
  standard: 1,
  flow: 1,
};

/** Minimum travel (px) before the body hands a vertical gesture to the sheet. */
const BODY_HANDOFF_THRESHOLD = 6;

function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      setInset(event?.endCoordinates?.height ?? 0);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setInset(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return inset;
}

export function BottomSheet({
  visible,
  title,
  subtitle,
  onRequestClose,
  children,
  footer,
  variant = 'standard',
  detentHeights,
  initialDetentIndex,
  onDetentChange,
  dirty = false,
  onRequestDismissGuard,
  committing = false,
  scrollable = true,
  topGap = 12,
  minimumHeight = 0,
  style,
  testID,
  accessibilityLabel,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const keyboardInset = useKeyboardInset();

  const safeAreaTop = insets.top || initialWindowMetrics?.insets.top || 0;
  const safeAreaBottom = insets.bottom || initialWindowMetrics?.insets.bottom || 0;

  const detents = useMemo(() => {
    const base = detentHeights && detentHeights.length > 0
      ? [...detentHeights]
      : resolveSheetDetents(variant, viewportHeight, safeAreaTop);
    return base
      .map((height) => Math.max(height, minimumHeight))
      .sort((a, b) => a - b);
  }, [detentHeights, minimumHeight, safeAreaTop, variant, viewportHeight]);

  const [detentIndex, setDetentIndex] = useState(() => {
    const requested = initialDetentIndex ?? DEFAULT_INITIAL_DETENT[variant] ?? 0;
    return Math.min(Math.max(0, requested), Math.max(0, detents.length - 1));
  });
  const [mounted, setMounted] = useState(visible);
  const [contentHeight, setContentHeight] = useState(0);

  const height = useRef(new Animated.Value(detents[detentIndex] ?? 0)).current;
  const heightRef = useRef(detents[detentIndex] ?? 0);
  const openProgress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const bodyScrollOffset = useRef(0);

  const detentsRef = useRef(detents);
  detentsRef.current = detents;
  const detentIndexRef = useRef(detentIndex);
  detentIndexRef.current = detentIndex;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const committingRef = useRef(committing);
  committingRef.current = committing;
  const onRequestCloseRef = useRef(onRequestClose);
  onRequestCloseRef.current = onRequestClose;
  const onRequestDismissGuardRef = useRef(onRequestDismissGuard);
  onRequestDismissGuardRef.current = onRequestDismissGuard;
  const onDetentChangeRef = useRef(onDetentChange);
  onDetentChangeRef.current = onDetentChange;

  // -- open / close motion -------------------------------------------------
  useEffect(() => {
    if (visible) {
      setMounted(true);
      const target = detentsRef.current[detentIndexRef.current] ?? 0;
      heightRef.current = target;
      height.setValue(target);
      openProgress.setValue(0);
      Animated.timing(openProgress, {
        toValue: 1,
        duration: resolveMotionDuration(reducedMotion, PREMIUM_MOTION.sheetIn),
        easing: MOTION_CURVES.standardOut,
        useNativeDriver: true,
      }).start();
      return;
    }
    if (!mounted) return;
    Animated.timing(openProgress, {
      toValue: 0,
      duration: resolveMotionDuration(reducedMotion, PREMIUM_MOTION.sheetOut),
      easing: MOTION_CURVES.standardInOut,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, mounted, openProgress, height, reducedMotion]);

  // -- overlay registry: a primary overlay blocks the pager ----------------
  useEffect(() => {
    if (!visible) return undefined;
    return registerOverlay({
      id: `bottom-sheet:${title}`,
      kind: 'sheet',
      close: () => {
        if (!committingRef.current) onRequestCloseRef.current();
      },
    });
  }, [visible, title]);

  const currentDetentHeight = detents[detentIndex] ?? 0;

  const usableHeight = Math.max(0, currentDetentHeight - keyboardInset);
  const contentFits = contentHeight > 0 && contentHeight <= usableHeight;
  const atMaximumDetent = detentIndex >= detents.length - 1;

  // -- keyboard promotion --------------------------------------------------
  useEffect(() => {
    if (!visible || keyboardInset <= 0) return;
    const promoted = resolveKeyboardDetentIndex({
      detents,
      currentIndex: detentIndexRef.current,
      keyboardInset,
    });
    if (promoted === detentIndexRef.current) return;
    setDetentIndex(promoted);
    detentIndexRef.current = promoted;
    heightRef.current = detents[promoted] ?? currentDetentHeight;
    Animated.timing(height, {
      toValue: detents[promoted] ?? currentDetentHeight,
      duration: resolveMotionDuration(reducedMotion, PREMIUM_MOTION.state),
      easing: MOTION_CURVES.standardOut,
      useNativeDriver: false,
    }).start();
    onDetentChangeRef.current?.(promoted);
  }, [detents, height, keyboardInset, reducedMotion, visible, currentDetentHeight]);

  const settleToDetent = useCallback(
    (index: number) => {
      const target = detentsRef.current[index] ?? 0;
      setDetentIndex(index);
      detentIndexRef.current = index;
      heightRef.current = target;
      Animated.timing(height, {
        toValue: target,
        duration: resolveMotionDuration(reducedMotion, PREMIUM_MOTION.state),
        easing: MOTION_CURVES.standardOut,
        useNativeDriver: false,
      }).start();
      onDetentChangeRef.current?.(index);
    },
    [height, reducedMotion],
  );

  const requestDismiss = useCallback(() => {
    if (committingRef.current) return;
    if (dirtyRef.current) {
      onRequestDismissGuardRef.current?.();
      return;
    }
    onRequestCloseRef.current();
  }, []);

  // -- grabber drag --------------------------------------------------------
  const grabberStartHeight = useRef(0);
  const grabberPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          !committingRef.current && Math.abs(gesture.dy) > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onMoveShouldSetPanResponderCapture: (_event, gesture) =>
          !committingRef.current && Math.abs(gesture.dy) > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderGrant: () => {
          height.stopAnimation();
          grabberStartHeight.current = heightRef.current;
        },
        onPanResponderMove: (_event, gesture) => {
          const list = detentsRef.current;
          const max = list.length > 0 ? Math.max(...list) : 0;
          const min = list.length > 0 ? Math.min(...list) : 0;
          const raw = grabberStartHeight.current - gesture.dy;
          let next = raw;
          if (raw > max) next = max + applyRubberBand(raw - max, viewportHeight);
          if (raw < min) next = min - applyRubberBand(min - raw, viewportHeight);
          heightRef.current = Math.max(0, next);
          height.setValue(heightRef.current);
        },
        onPanResponderRelease: (_event, gesture) => {
          const list = detentsRef.current;
          const min = list.length > 0 ? Math.min(...list) : 0;
          const raw = grabberStartHeight.current - gesture.dy;
          const travel = min - raw;
          const intent = resolveDismissIntent({
            detents: list,
            currentHeight: raw,
            travel,
            velocity: -gesture.vy,
          });
          if (intent === 'dismiss' && !dirtyRef.current && !committingRef.current) {
            heightRef.current = 0;
            Animated.timing(height, {
              toValue: 0,
              duration: resolveMotionDuration(reducedMotion, PREMIUM_MOTION.sheetOut),
              easing: MOTION_CURVES.standardInOut,
              useNativeDriver: false,
            }).start(() => {
              onRequestCloseRef.current();
            });
            return;
          }
          if (intent === 'dismiss' && dirtyRef.current) {
            // A dirty sheet never dismisses: it snaps back and asks.
            settleToDetent(closestDetentIndex(list, min));
            onRequestDismissGuardRef.current?.();
            return;
          }
          const settled = resolveSettledDetentIndex({
            detents: list,
            currentHeight: raw,
            velocity: -gesture.vy,
          });
          settleToDetent(settled);
        },
        onPanResponderTerminate: () => {
          const list = detentsRef.current;
          const settled = resolveSettledDetentIndex({
            detents: list,
            currentHeight: heightRef.current,
          });
          settleToDetent(settled);
        },
      }),
    [height, reducedMotion, settleToDetent, viewportHeight],
  );

  // -- body scroll handoff -------------------------------------------------
  const bodyPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          !committingRef.current &&
          gesture.dy > BODY_HANDOFF_THRESHOLD &&
          bodyScrollOffset.current <= 0,
        onMoveShouldSetPanResponderCapture: (_event, gesture) =>
          !committingRef.current &&
          gesture.dy < -BODY_HANDOFF_THRESHOLD &&
          !atMaximumDetent,
        onPanResponderGrant: () => {
          height.stopAnimation();
          grabberStartHeight.current = heightRef.current;
        },
        onPanResponderMove: (_event, gesture) => {
          const list = detentsRef.current;
          const max = list.length > 0 ? Math.max(...list) : 0;
          const min = list.length > 0 ? Math.min(...list) : 0;
          const raw = grabberStartHeight.current - gesture.dy;
          let next = raw;
          if (raw > max) next = max + applyRubberBand(raw - max, viewportHeight);
          if (raw < min) next = min - applyRubberBand(min - raw, viewportHeight);
          heightRef.current = Math.max(0, next);
          height.setValue(heightRef.current);
        },
        onPanResponderTerminationRequest: () => true,
        onPanResponderRelease: (_event, gesture) => {
          const list = detentsRef.current;
          const settled = resolveSettledDetentIndex({
            detents: list,
            currentHeight: heightRef.current,
            velocity: -gesture.vy,
          });
          settleToDetent(settled);
        },
        onPanResponderTerminate: () => {
          const list = detentsRef.current;
          const settled = resolveSettledDetentIndex({
            detents: list,
            currentHeight: heightRef.current,
          });
          settleToDetent(settled);
        },
      }),
    [atMaximumDetent, height, settleToDetent, viewportHeight],
  );

  const grabber = (
    <View
      {...grabberPanResponder.panHandlers}
      style={styles.grabberTouchArea}
      accessibilityRole="adjustable"
      accessibilityLabel={`Ajustar ${title}`}
      accessibilityValue={{ text: `Altura ${Math.round(currentDetentHeight)} de ${viewportHeight}` }}
      testID={testID ? `${testID}-grabber` : undefined}
    >
      <View style={styles.grabber} />
    </View>
  );

  const body = scrollable ? (
    <ScrollView
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      scrollEnabled={atMaximumDetent || contentFits}
      onScroll={(event) => {
        bodyScrollOffset.current = event.nativeEvent.contentOffset.y;
      }}
      scrollEventThrottle={16}
      onContentSizeChange={(_w, h) => setContentHeight(h)}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.body}>
      {children}
    </View>
  );

  // The travel of the open/close motion is relative to the final detent.
  const surfaceTravel = reducedMotion ? 0 : 24;
  const surfaceOpacity = openProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });
  const surfaceTranslate = openProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [surfaceTravel, 0],
  });

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={requestDismiss} statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: openProgress }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={requestDismiss}
            disabled={committing}
            accessibilityRole="button"
            accessibilityLabel={`Cerrar ${title}`}
            testID={testID ? `${testID}-backdrop` : undefined}
          />
        </Animated.View>
        <Animated.View
          {...bodyPanResponder.panHandlers}
          style={[
            styles.sheet,
            {
              // The top anchor stays stable while the keyboard is open: only
              // the bottom of the sheet moves up.
              bottom: keyboardInset,
              height,
              opacity: surfaceOpacity,
              transform: [{ translateY: surfaceTranslate }],
            },
            style,
          ]}
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel ?? title}
          testID={testID}
        >
          {grabber}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <AppText variant="title2" weight="800" numberOfLines={1}>{title}</AppText>
              {subtitle ? <AppText variant="caption" tone="secondary" numberOfLines={1}>{subtitle}</AppText> : null}
            </View>
            <AppButton
              variant="icon"
              size="sm"
              onPress={requestDismiss}
              disabled={committing}
              accessibilityLabel={`Cerrar ${title}`}
            >
              <HomePlusIcon name="close" size={20} color={colors.text.secondary} />
            </AppButton>
          </View>
          {body}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
          <View style={{ height: safeAreaBottom }} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.surface.overlay },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.background.base,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 18,
  },
  grabberTouchArea: {
    minWidth: 44,
    minHeight: 44,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grabber: {
    width: 44,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border.strong,
  },
  header: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  headerText: { flex: 1 },
  body: { flex: 1, minHeight: 0 },
  bodyContent: { paddingBottom: spacing[4] },
  footer: {
    flexShrink: 0,
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
});
