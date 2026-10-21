'use strict';

const React = require('react');

const SafeAreaView = (props: any) => React.createElement('SafeAreaView', props, props?.children);

module.exports = {
  SafeAreaView,
  SafeAreaProvider: (props: any) => React.createElement(React.Fragment, null, props?.children),
  useSafeAreaInsets: () => ({ top: 47, right: 0, bottom: 34, left: 0 }),
};
