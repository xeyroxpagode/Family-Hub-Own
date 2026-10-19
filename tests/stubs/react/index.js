'use strict';

// Shared `react` test stub.
//
// Compiled Planner suites import UI/context modules that call React primitives
// at module load time (createContext, useMemo in initializers, ...). This stub
// provides the inert surface those modules touch: enough for imports to resolve
// without a renderer. Hooks are no-ops and have no state semantics — suites that
// assert behavior use the pure service layer, not rendered components.

function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...(props || {}),
      children: children.length <= 1 ? children[0] : children,
    },
  };
}

const noop = () => {};
const identity = (value) => value;

const React = {
  createElement,
  cloneElement: (element) => element,
  isValidElement: (value) => Boolean(value && value.type),
  Fragment: Symbol.for('react.fragment'),
  StrictMode: Symbol.for('react.strict_mode'),
  createContext(defaultValue) {
    return {
      Provider: function Provider(props) {
        return props && props.children;
      },
      Consumer: function Consumer(props) {
        return props && props.children;
      },
      displayName: 'Context',
      _currentValue: defaultValue,
    };
  },
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, noop],
  useReducer: (reducer, initialState) => [initialState, noop],
  useEffect: noop,
  useLayoutEffect: noop,
  useMemo: (factory) => factory(),
  useCallback: (callback) => callback,
  useRef: (initial) => ({ current: initial }),
  useContext: (context) => (context ? context._currentValue : undefined),
  useId: () => 'test-id',
  forwardRef: (render) => render,
  memo: (component) => component,
  lazy: (factory) => factory,
  Suspense: Symbol.for('react.suspense'),
};

React.default = React;
React.__esModule = true;

module.exports = React;
