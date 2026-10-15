'use strict';

// Shared `react-native` test stub.
//
// Compiled Planner suites import UI modules that reach react-native at module
// load time. Only the inert surface those modules touch is provided here: enough
// for imports to resolve without a native runtime. Nothing here has behavior.

const noop = () => {};

const hostComponent = (name) => {
  const Component = (props) => ({ type: name, props: props || {} });
  Component.displayName = name;
  return Component;
};

exports.Platform = {
  OS: 'web',
  select(values) {
    return values.web ?? values.default;
  },
};

exports.View = hostComponent('View');
exports.Text = hostComponent('Text');
exports.Image = hostComponent('Image');
exports.ScrollView = hostComponent('ScrollView');
exports.Pressable = hostComponent('Pressable');
exports.TouchableOpacity = hostComponent('TouchableOpacity');
exports.TouchableHighlight = hostComponent('TouchableHighlight');
exports.ActivityIndicator = hostComponent('ActivityIndicator');
exports.RefreshControl = hostComponent('RefreshControl');
exports.Modal = hostComponent('Modal');
exports.TextInput = hostComponent('TextInput');
exports.FlatList = hostComponent('FlatList');
exports.SectionList = hostComponent('SectionList');
exports.Picker = hostComponent('Picker');
exports.Switch = hostComponent('Switch');

exports.StyleSheet = {
  create: (styles) => styles || {},
  flatten: (style) => (Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style || {}),
  absoluteFill: {},
  absoluteFillObject: {},
  hairlineWidth: 1,
};

exports.Dimensions = {
  get: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
  addEventListener: () => ({ remove: noop }),
  removeEventListener: noop,
};

exports.AccessibilityInfo = {
  isReduceMotionEnabled: async () => false,
  announceForAccessibility: noop,
  addEventListener: () => ({ remove: noop }),
};

exports.Alert = { alert: noop };

// Minimal Animated surface: values are inert objects and the animators resolve
// immediately, so no test needs a native driver.
const animatedValue = (initial) => ({
  __isAnimatedValue: true,
  _value: initial,
  setValue(value) {
    this._value = value;
  },
});

exports.Animated = {
  Value: animatedValue,
  ValueXY: function ValueXY(init) {
    return { x: animatedValue(init && init.x), y: animatedValue(init && init.y) };
  },
  View: hostComponent('Animated.View'),
  Text: hostComponent('Animated.Text'),
  Image: hostComponent('Animated.Image'),
  ScrollView: hostComponent('Animated.ScrollView'),
  createAnimatedComponent: (component) => component,
  spring: (value, config, callback) => {
    if (callback) callback({ finished: true });
    return { start: noop, stop: noop };
  },
  timing: (value, config, callback) => {
    if (callback) callback({ finished: true });
    return { start: noop, stop: noop };
  },
  decay: () => ({ start: noop, stop: noop }),
  sequence: (animations) => ({ start: noop, stop: noop }),
  parallel: (animations) => ({ start: noop, stop: noop }),
  loop: (animation) => ({ start: noop, stop: noop }),
  delay: () => ({ start: noop, stop: noop }),
  event: () => noop,
  add: () => noop,
  createAnimatedComponent2: noop,
};
