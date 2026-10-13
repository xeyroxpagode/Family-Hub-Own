import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../constants/theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * HomeCloud HC-POL-015 — THE EDGE THE DRAG SWEEP IS SCROLLING FROM.
 *
 * While a member drags a selection towards the top or bottom edge the list
 * keeps scrolling under a finger that is NOT moving. Without a cue that reads as
 * noise: the content moves and nothing says why. This hint exists ONLY while a
 * real auto-scroll step is actually moving the list — which is why the screen
 * tells it the edge and clears it the moment the step cannot move any further.
 *
 * It is a <=24 pt accent at the very edge, never a permanent gradient: a
 * constant strip would be chrome the member learns to ignore, and it would also
 * sit over content during an ordinary scroll.
 */

export interface FileAutoScrollEdgeHintProps {
  /** The edge the sweep is currently scrolling towards, or null when it is not. */
  edge: 'top' | 'bottom' | null;
}

const HINT_HEIGHT = 24;

export function FileAutoScrollEdgeHint({ edge }: FileAutoScrollEdgeHintProps) {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: edge === null ? 0 : 1,
      duration: edge === null ? (reducedMotion ? 0 : 100) : reducedMotion ? 0 : 100,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [edge, progress, reducedMotion]);

  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      style={[
        styles.host,
        edge === 'top' ? styles.top : styles.bottom,
        { opacity: progress },
      ]}
    >
      <View style={[styles.strip, edge === 'top' ? styles.stripTop : styles.stripBottom]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: HINT_HEIGHT,
    alignItems: 'center',
    zIndex: 1,
  },
  top: { top: 0 },
  bottom: { bottom: 0 },
  strip: {
    width: '72%',
    height: HINT_HEIGHT,
    // An extremely faint accent: a cue, never a band over the content.
    backgroundColor: colors.brand,
    opacity: 0.1,
    borderRadius: spacing[2],
  },
  stripTop: { borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  stripBottom: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
});
