'use strict';

function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...(props || {}),
      children: children.length <= 1 ? children[0] : children,
    },
  };
}

module.exports = {
  createElement,
  Fragment: Symbol.for('react.fragment'),
  default: {
    createElement,
    Fragment: Symbol.for('react.fragment'),
  },
};
