import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { SegmentedControl } from '../ui';
import { shadows } from '../../constants/theme';

export type FamilyViewTab = 'people' | 'map';

type FamilyViewSegmentedControlProps = {
  activeTab: FamilyViewTab;
  onChange: (tab: FamilyViewTab) => void;
  style?: StyleProp<ViewStyle>;
};

/** Shared view switcher for the Family people and map experiences. */
export function FamilyViewSegmentedControl({
  activeTab,
  onChange,
  style,
}: FamilyViewSegmentedControlProps) {
  return (
    <SegmentedControl
      value={activeTab}
      onChange={onChange}
      options={[
        { value: 'people', label: 'Personas' },
        { value: 'map', label: 'Mapa' },
      ]}
      size="compact"
      animatedActive
      style={[styles.control, style]}
    />
  );
}

const styles = StyleSheet.create({
  control: {
    alignSelf: 'center',
    width: '58%',
    minWidth: 188,
    maxWidth: 236,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    ...shadows.shadow2,
  },
});
