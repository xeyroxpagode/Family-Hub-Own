'use strict';

function makeSvgComponent(type) {
  return function SvgComponent(props) {
    return { type, props: { ...props, children: props && props.children } };
  };
}

const Svg = makeSvgComponent('Svg');
const Path = makeSvgComponent('Path');
const Polygon = makeSvgComponent('Polygon');
const Circle = makeSvgComponent('Circle');

module.exports = {
  __esModule: true,
  default: Svg,
  Svg,
  Path,
  Polygon,
  Circle,
};
