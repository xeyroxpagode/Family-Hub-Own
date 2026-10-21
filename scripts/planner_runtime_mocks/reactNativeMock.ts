'use strict';

// Renderer-compatible `react-native` mock for the Planner menu/feedback
// runtime suites.
//
// The repository-wide `tests/stubs/react-native` stub is intentionally inert:
// it returns plain objects so modules can be imported without a renderer, but
// those values are not valid React elements. The menu and toast defects are
// render-order defects (conditional mounting, overlay stacking, subscription
// lifecycle), so they can only be reproduced against a real reconciler. This
// mock renders every primitive as a host component (a plain string type) so
// `react-test-renderer` produces a real tree that can be queried and driven.

const React = require('react');

const hostComponent = (name: string) => {
  const Component = (props: any) => React.createElement(name, props, props?.children);
  Component.displayName = name;
  return Component;
};

const View = hostComponent('View');
const Text = hostComponent('Text');
const Image = hostComponent('Image');
const ScrollView = hostComponent('ScrollView');
const Pressable = hostComponent('Pressable');
const TouchableOpacity = hostComponent('TouchableOpacity');
const TouchableHighlight = hostComponent('TouchableHighlight');
const ActivityIndicator = hostComponent('ActivityIndicator');
const RefreshControl = hostComponent('RefreshControl');
const Modal = hostComponent('Modal');
const TextInput = hostComponent('TextInput');
const FlatList = hostComponent('FlatList');
const SectionList = hostComponent('SectionList');
const Switch = hostComponent('Switch');

const StyleSheet = {
  create: (styles: any) => styles || {},
  flatten: (style: any) => (Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style || {}),
  // `absoluteFill` must stay a POSITIONED box: the anchored menu relies on it
  // being relative to its nearest positioned ancestor, and that relationship is
  // part of the defect under test.
  absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  hairlineWidth: 1,
};

// --- Animated -------------------------------------------------------------
// Only the surface the components touch: a value holder plus timing/spring
// drivers that settle immediately and invoke their completion callback, so
// entrance/exit animations do not leave tests waiting on timers.

class AnimatedValue {
  _value: any;
  constructor(initial: any) {
    this._value = initial;
  }
  setValue(value: any) {
    this._value = value;
  }
  interpolate() {
    return this;
  }
  addListener() {
    return { remove() {} };
  }
  removeListener() {}
  stopAnimation(cb?: (v: any) => void) {
    if (cb) cb(this._value);
  }
}

/**
 * Animators are invoked in both shapes React Native supports:
 *  - `Animated.timing(value, config)`            -> animation handle
 *  - `Animated.timing(value, config, callback)`  -> animation handle
 * and composites (`parallel`/`sequence`) may receive either animations or a
 * completion callback as their single argument. Accept both.
 */
const runAnimation = (first: any, second: any) => {
  const callback = typeof second === 'function' ? second : (typeof first === 'function' ? first : undefined);
  if (callback) callback({ finished: true });
  return { start: (cb?: any) => { if (cb) cb({ finished: true }); }, stop: () => {} };
};

const composite = (animationsOrCallback?: any) => ({
  start: (cb?: any) => {
    // If a callback was passed as the composite's own argument (rather than to
    // `.start`), honour it too.
    if (typeof animationsOrCallback === 'function') animationsOrCallback({ finished: true });
    if (cb) cb({ finished: true });
  },
  stop: () => {},
});

const Animated = {
  Value: AnimatedValue,
  ValueXY: function ValueXY(init: any) {
    return { x: new AnimatedValue(init?.x), y: new AnimatedValue(init?.y) };
  },
  View: hostComponent('Animated.View'),
  Text: hostComponent('Animated.Text'),
  Image: hostComponent('Animated.Image'),
  ScrollView: hostComponent('Animated.ScrollView'),
  createAnimatedComponent: (component: any) => component,
  spring: runAnimation,
  timing: runAnimation,
  decay: runAnimation,
  sequence: composite,
  parallel: composite,
  loop: composite,
  delay: composite,
  event: () => () => {},
  add: () => 0,
};

const AccessibilityInfo = {
  isReduceMotionEnabled: async () => false,
  isScreenReaderEnabled: async () => false,
  announceForAccessibility: () => {},
  setAccessibilityFocus: () => {},
  addEventListener: () => ({ remove() {} }),
  findNodeHandle: () => 1,
};

module.exports = {
  Platform: { OS: 'ios', select: (values: any) => values.ios ?? values.default },
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  TouchableOpacity,
  TouchableHighlight,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  FlatList,
  SectionList,
  Switch,
  StyleSheet,
  Animated,
  AccessibilityInfo,
  Alert: { alert: () => {} },
  Dimensions: {
    get: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
    addEventListener: () => ({ remove() {} }),
  },
  Keyboard: { dismiss: () => {} },
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
  useColorScheme: () => 'light',
  SafeAreaView: hostComponent('SafeAreaView'),
  BackHandler: { addEventListener: () => ({ remove() {} }) },
  PanResponder: { create: () => ({ panHandlers: {} }) },
  Easing: { bezier: () => (t: number) => t },
  KeyboardAvoidingView: hostComponent('KeyboardAvoidingView'),
};