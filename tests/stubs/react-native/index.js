'use strict';

exports.Platform = {
  OS: 'web',
  select(values) {
    return values.web ?? values.default;
  },
};
