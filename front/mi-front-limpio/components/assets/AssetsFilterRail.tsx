import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { FilterChip } from '../ui/FilterChip';
import {
  ASSET_PROFILE_FILTERS,
  type AssetProfileFilterKey,
} from '../../services/assets';

export type AssetsFilterRailProps = {
  selected: AssetProfileFilterKey;
  onSelect: (key: AssetProfileFilterKey) => void;
};

/** Rail horizontal con overflow perceptible y sin saltos de scroll. */
export function AssetsFilterRail({ selected, onSelect }: AssetsFilterRailProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
      keyboardShouldPersistTaps="handled"
    >
      {ASSET_PROFILE_FILTERS.map((filter) => (
        <FilterChip
          key={filter.key}
          label={filter.label}
          selected={selected === filter.key}
          onPress={() => onSelect(filter.key)}
        />
      ))}
      <View style={styles.tail} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rail: {
    gap: 8,
    paddingRight: 4,
  },
  tail: {
    width: 4,
  },
});
