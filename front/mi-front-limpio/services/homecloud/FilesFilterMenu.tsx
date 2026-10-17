import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActionSheet, AppText, FilterChip } from '../../components/ui';
import { spacing } from '../../constants/theme';
import {
  FILES_SHOW_OPTIONS,
  FILES_SORT_OPTIONS,
  FILES_VIEW_OPTIONS,
  type FilesFilterState,
  type FilesShowMode,
  type FilesViewMode,
} from './homecloudFilesFilters';
import type { FileSort } from './homecloudFilesService';

/**
 * HomeCloud Files - THE DISPLAY FILTER MENU.
 *
 * One compact icon replaces the permanent `Recientes / A-Z` button and the
 * permanent `Favoritos` toggle. The grammar it renders lives in
 * `homecloudFilesFilters`, which is a pure module with no React and no transport,
 * so the contract can be proven without a device or a renderer.
 *
 * The menu grammar is the DONOR screen's: labelled groups of selectable chips
 * inside one content-sized sheet. Nothing here invents a pattern the app does not
 * already use, and the donor screen is untouched.
 */
export interface FilesFilterMenuProps {
  visible: boolean;
  state: FilesFilterState;
  busy?: boolean;
  onChangeShow: (show: FilesShowMode) => void;
  onChangeSort: (sort: FileSort) => void;
  onChangeView: (view: FilesViewMode) => void;
  onClose: () => void;
}

export function FilesFilterMenu({
  visible,
  state,
  busy = false,
  onChangeShow,
  onChangeSort,
  onChangeView,
  onClose,
}: FilesFilterMenuProps) {
  return (
    <ActionSheet visible={visible} title="Organizar" onRequestClose={onClose} size="content">
      <View style={styles.groups}>
        <View style={styles.group}>
          <AppText variant="caption" tone="secondary" weight="800">MOSTRAR</AppText>
          <View style={styles.chips}>
            {FILES_SHOW_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={state.show === option.value}
                disabled={busy}
                onPress={() => onChangeShow(option.value)}
              />
            ))}
          </View>
        </View>
        <View style={styles.group}>
          <AppText variant="caption" tone="secondary" weight="800">ORDENAR</AppText>
          <View style={styles.chips}>
            {FILES_SORT_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={state.sort === option.value}
                disabled={busy}
                onPress={() => onChangeSort(option.value)}
              />
            ))}
          </View>
        </View>
        <View style={styles.group}>
          <AppText variant="caption" tone="secondary" weight="800">VISTA</AppText>
          <View style={styles.chips}>
            {FILES_VIEW_OPTIONS.map((option) => (
              <FilterChip key={option.value} label={option.label} selected={state.view === option.value} disabled={busy} onPress={() => onChangeView(option.value)} />
            ))}
          </View>
        </View>
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  groups: { gap: spacing[5], paddingBottom: spacing[2] },
  group: { gap: spacing[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
});
