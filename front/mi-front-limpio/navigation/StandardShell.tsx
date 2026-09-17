import React from 'react';

import { HomeTabNavigator } from './HomeTabNavigator';

/**
 * The untouched Standard presentation shell. Domain providers, routes and
 * the existing bottom navigation remain owned by HomeTabNavigator.
 */
export function StandardShell() {
  return <HomeTabNavigator />;
}
