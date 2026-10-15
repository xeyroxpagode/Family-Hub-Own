'use strict';

// Icon glyphs are decorative. Rendering a host node keeps the tree shape
// realistic without pulling the icon font into the runtime suites.

const React = require('react');

const makeIcon = (family: string) => (props: any) =>
  React.createElement('Icon', { ...props, __family: family });

module.exports = {
  Ionicons: makeIcon('ionicons'),
  MaterialCommunityIcons: makeIcon('mdi'),
  MaterialIcons: makeIcon('material'),
};