/**
 * Shared horizontal pager.
 *
 * A reusable, controlled pager that keeps every page MOUNTED (so local state
 * survives a tab change), follows the finger 1:1 and settles on a page using
 * position + direction + velocity.
 *
 * It is the horizontal half of the gesture foundation: vertical scroll, the
 * native iOS edge-back and a future row-swipe all coexist with it because the
 * pager only claims a gesture when the horizontal intent is unambiguous.
 *
 * Contract source:
 * `docs/implementation/inventory/v2/03_INVENTORY_PREMIUM_UX_FREEZE.md` §2.4
 * and §3.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { MOTION_CURVES, PREMIUM_MOTION, resolveMotionDuration } from '../../constants/motionSystem';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { closeOpenPopovers, hasPrimaryOverlay } from '../../services/core/overlayRegistry';
import { applyRubberBand } from '../../services/core/sheetDetents';

export type HorizontalPagerToken = {
  /** |dx| must beat |dy| by this factor to take the gesture. */
  intentRatio: number;
  /** Minimum horizontal travel (px) before the pager takes the gesture. */
  intentMinDistance: number;
  /** Velocity (px/ms) that decides the page on its own. */
  settleVelocity: number;
  /** Width (px) of the left edge reserved for the native back gesture. */
  edgeBackZone: number;
};

export const DEFAULT_PAGER_TOKENS: HorizontalPagerToken = {
  intentRatio: 1.15,
  intentMinDistance: 8,
  settleVelocity: 0.35,
  edgeBackZone: 24,
};

export type HorizontalPagerProps = {
  /** Pages, in order. Every page stays mounted. */
  children: React.ReactNode[];
  /** Target page index (controlled). */
  index: number;
  /** A new target page was requested (tap, programmatic). */
  onIndexChange: (index: number) => void;
  /** The pager came to rest on a page. */
  onSettled?: (index: number) => void;
  /** Live progress across the whole pager, 0..1. */
  onProgress?: (progress: number) => void;
  /** The pager started / stopped moving. */
  onTransitionChange?: (transitioning: boolean) => void;
  /** The pager is disabled (selection lock, primary overlay...). */
  disabled?: boolean;
  tokens?: Partial<HorizontalPagerToken>;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function HorizontalPager({
  children,
  index,
  onIndexChange,
  onSettled,
  onProgress,
  onTransitionChange,
  disabled = false,
  tokens,
  style,
  testID,
}: HorizontalPagerProps) {
  const reducedMotion = useReducedMotion();
  const resolvedTokens = { ...DEFAULT_PAGER_TOKENS, ...(tokens ?? {}) };
  const [width, setWidth] = useState(0);
  const pageCount = children.length;

  const translateX = useRef(new Animated.Value(0)).current;
  const currentOffsetRef = useRef(0);
  const widthRef = useRef(0);
  const indexRef = useRef(index);
  const pageCountRef = useRef(pageCount);
  const startIndexRef = useRef(index);
  const startOffsetRef = useRef(0);
  const disabledRef = useRef(disabled);
  const transitionRef = useRef(false);

  widthRef.current = width;
  pageCountRef.current = pageCount;

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const emitProgress = useCallback(
    (value: number) => {
      if (!onProgress) return;
      const total = Math.max(1, pageCountRef.current - 1);
      const progress = Math.min(1, Math.max(0, value / total));
      onProgress(progress);
    },
    [onProgress],
  );

  const setTransition = useCallback(
    (transitioning: boolean) => {
      if (transitionRef.current === transitioning) return;
      transitionRef.current = transitioning;
      onTransitionChange?.(transitioning);
    },
    [onTransitionChange],
  );

  // Keep the live progress in sync with the animation, including the settle.
  useEffect(() => {
    const id = translateX.addListener(({ value }) => {
      currentOffsetRef.current = value;
      const total = Math.max(1, pageCountRef.current - 1);
      emitProgress(-value / (Math.max(1, widthRef.current) * total));
    });
    return () => translateX.removeListener(id);
  }, [emitProgress, translateX]);

  const settleTo = useCallback(
    (target: number, animated: boolean) => {
      const clamped = Math.min(Math.max(0, target), Math.max(0, pageCountRef.current - 1));
      const offset = -clamped * widthRef.current;
      // Nothing to animate: the pager is already where it has to rest. This
      // keeps the shell from reporting a transition that never happened.
      if (Math.abs(offset - currentOffsetRef.current) < 1) {
        translateX.setValue(offset);
        emitProgress(clamped);
        setTransition(false);
        onSettled?.(clamped);
        return;
      }
      if (!animated) {
        translateX.setValue(offset);
        emitProgress(clamped);
        setTransition(false);
        onSettled?.(clamped);
        return;
      }
      // The pager is "in transition" until it comes to rest: the header
      // actions are not actionable and the active tab does not change yet.
      setTransition(true);
      Animated.timing(translateX, {
        toValue: offset,
        duration: resolveMotionDuration(reducedMotion, PREMIUM_MOTION.localNav),
        easing: MOTION_CURVES.standardOut,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (!finished) return;
        setTransition(false);
        onSettled?.(clamped);
      });
    },
    [emitProgress, onSettled, reducedMotion, setTransition, translateX],
  );

  // A programmatic index change animates to the new page.
  useEffect(() => {
    if (width === 0) return;
    settleTo(index, true);
    // `settleTo` depends on the animation internals; the index is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, width]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponderCapture: (_event, gesture) => {
          if (disabledRef.current) return false;
          if (hasPrimaryOverlay()) return false;
          // The native edge-back of a real route wins from the left edge.
          if (gesture.x0 <= resolvedTokens.edgeBackZone) return false;
          const horizontal = Math.abs(gesture.dx);
          const vertical = Math.abs(gesture.dy);
          if (horizontal < resolvedTokens.intentMinDistance) return false;
          return horizontal > vertical * resolvedTokens.intentRatio;
        },
        onPanResponderGrant: () => {
          translateX.stopAnimation();
          startIndexRef.current = indexRef.current;
          startOffsetRef.current = -indexRef.current * widthRef.current;
          // A popover never survives the transition that it was covering.
          closeOpenPopovers();
          setTransition(true);
        },
        onPanResponderMove: (_event, gesture) => {
          const pageWidth = Math.max(1, widthRef.current);
          let offset = startOffsetRef.current + gesture.dx;
          const first = 0;
          const last = -(Math.max(0, pageCountRef.current - 1)) * pageWidth;
          if (offset > first) offset = first + applyRubberBand(offset - first, pageWidth);
          if (offset < last) offset = last - applyRubberBand(last - offset, pageWidth);
          translateX.setValue(offset);
          emitProgress(-offset / (pageWidth * Math.max(1, pageCountRef.current - 1)));
        },
        onPanResponderRelease: (_event, gesture) => {
          const pageWidth = Math.max(1, widthRef.current);
          const position = startIndexRef.current + -gesture.dx / pageWidth;
          let target: number;
          if (Math.abs(gesture.vx) >= resolvedTokens.settleVelocity) {
            const goingNext = gesture.vx < 0;
            target = goingNext ? Math.ceil(position) : Math.floor(position);
            target = Math.min(
              Math.max(0, pageCountRef.current - 1),
              Math.max(0, Math.min(pageCountRef.current - 1, target)),
            );
            target = Math.min(
              Math.max(0, pageCountRef.current - 1),
              Math.max(startIndexRef.current - 1, Math.min(startIndexRef.current + 1, target)),
            );
          } else {
            target = Math.round(position);
          }
          const clamped = Math.min(Math.max(0, target), Math.max(0, pageCountRef.current - 1));
          if (clamped !== indexRef.current) onIndexChange(clamped);
          settleTo(clamped, true);
        },
        onPanResponderTerminate: () => {
          settleTo(indexRef.current, true);
        },
      }),
    [emitProgress, onIndexChange, resolvedTokens.edgeBackZone, resolvedTokens.intentMinDistance, resolvedTokens.intentRatio, resolvedTokens.settleVelocity, setTransition, settleTo, translateX],
  );

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (Math.abs(next - width) < 1) return;
    setWidth(next);
    widthRef.current = next;
    const offset = -indexRef.current * next;
    currentOffsetRef.current = offset;
    translateX.setValue(offset);
  };

  return (
    <View
      style={[styles.container, style]}
      onLayout={onLayout}
      testID={testID}
      {...panResponder.panHandlers}
    >
      <Animated.View
        style={[
          styles.track,
          { width: pageCount > 0 ? width * pageCount : 0, transform: [{ translateX }] },
        ]}
      >
        {children.map((child, childIndex) => (
          <View key={childIndex} style={[styles.page, { width }]}>
            {child}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  track: { flexDirection: 'row', height: '100%' },
  page: { height: '100%' },
});
