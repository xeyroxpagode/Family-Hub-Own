/**
 * Planner P2.2A — Presets Foundation — lightweight Preset Picker.
 *
 * Purpose: USE a preset. It is NOT an administration surface: no edit, no
 * delete, no create inside the picker. Tap a row to select a preset, return
 * it to the caller via `onSelect`, and close (`onClose`).
 *
 * Canonical hierarchy (frozen):
 *   DEL HOGAR      (household presets first — editable, closer to the user)
 *   DE HOMEPLUS    (system presets second — read-only but usable)
 * One continuous flat list; no tabs, no kind filters (task-only canonical).
 *
 * The picker loads its own data (`listPlannerPresets`, task-only) so every
 * consumer (quick rail, TaskForm, future surfaces) shares one behavior with
 * runtime data — no stale caches.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '../../../context/AppThemeContext';
import type { AppResolvedTheme } from '../../../constants/theme';
import { HomePlusIcon } from '../../../constants/icons';
import { ActionSheet, AppText } from '../../ui';
import type { PlannerPreset } from '../../../types/plannerPresetsDrafts';
import { listPlannerPresets } from '../../../services/plannerPresets';
import {
  buildCanonicalPresetGroups,
  presetTaskPayloadFromPreset,
} from '../../../services/planner/plannerPresetTaskDomain';

export type PlannerPresetPickerSheetProps = {
  readonly visible: boolean;
  /** When absent the picker renders nothing (no session available). */
  readonly accessToken?: string | null;
  readonly onSelect: (preset: PlannerPreset) => void;
  readonly onClose: () => void;
};

export function PlannerPresetPickerSheet({
  visible,
  accessToken,
  onSelect,
  onClose,
}: PlannerPresetPickerSheetProps) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [presets, setPresets] = useState<readonly PlannerPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const response = await listPlannerPresets(accessToken, { entity_type: 'task' });
      setPresets(response.presets);
    } catch {
      setError('No pudimos cargar los presets.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  const groups = useMemo(() => buildCanonicalPresetGroups(presets), [presets]);

  const sections = useMemo(() => {
    const rows: Array<
      | { type: 'header'; id: string; title: string }
      | { type: 'preset'; id: string; preset: PlannerPreset }
    > = [];
    if (groups.household.length > 0) {
      rows.push({ type: 'header', id: 'header-household', title: 'DEL HOGAR' });
      for (const preset of groups.household) rows.push({ type: 'preset', id: preset.id, preset });
    }
    if (groups.homeplus.length > 0) {
      rows.push({ type: 'header', id: 'header-homeplus', title: 'DE HOMEPLUS' });
      for (const preset of groups.homeplus) rows.push({ type: 'preset', id: preset.id, preset });
    }
    return rows;
  }, [groups]);

  const handleSelect = useCallback(
    (preset: PlannerPreset) => {
      onSelect(preset);
      onClose();
    },
    [onSelect, onClose],
  );

  return (
    <ActionSheet
      visible={visible}
      title="Elegir preset"
      onRequestClose={onClose}
      size="content"
    >
      {loading && presets.length === 0 ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.terracotta[500]} />
        </View>
      ) : null}

      {!loading && error ? (
        <View style={styles.stateBox}>
          <AppText variant="bodySmall" tone="tertiary" align="center">
            {error}
          </AppText>
          <Pressable onPress={() => void load()} accessibilityRole="button" accessibilityLabel="Reintentar">
            <AppText variant="bodySmall" weight="700" tone="brand" style={styles.retryText}>
              Reintentar
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {!loading && !error && sections.length === 0 ? (
        <View style={styles.stateBox}>
          <AppText variant="bodySmall" tone="tertiary" align="center">
            Todavía no hay presets disponibles.
          </AppText>
        </View>
      ) : null}

      {sections.length > 0 ? (
        <FlatList
          data={sections}
          keyExtractor={(row) => row.id}
          style={styles.list}
          scrollEnabled={sections.length > 8}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <AppText variant="caption" weight="800" style={styles.sectionHeader}>
                  {item.title}
                </AppText>
              );
            }
            const payload = presetTaskPayloadFromPreset(item.preset);
            const meta = payload?.note ? payload.note : null;
            return (
              <Pressable
                style={styles.row}
                onPress={() => handleSelect(item.preset)}
                accessibilityRole="button"
                accessibilityLabel={`Usar preset ${item.preset.name}`}
              >
                <View style={styles.rowContent}>
                  <AppText variant="body" weight="600" numberOfLines={1}>
                    {item.preset.name}
                  </AppText>
                  {meta ? (
                    <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                      {meta}
                    </AppText>
                  ) : null}
                </View>
                <HomePlusIcon name="chevron-forward" size={18} color={colors.text.tertiary} />
              </Pressable>
            );
          }}
        />
      ) : null}
    </ActionSheet>
  );
}

function createStyles(theme: AppResolvedTheme) {
  const { colors } = theme;
  return StyleSheet.create({
    list: {
      maxHeight: 420,
      marginHorizontal: -4,
      paddingHorizontal: 4,
    },
    sectionHeader: {
      color: colors.text.tertiary,
      letterSpacing: 0.5,
      marginTop: 14,
      marginBottom: 4,
      paddingHorizontal: 2,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 48,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.subtle,
    },
    rowContent: {
      flex: 1,
      gap: 2,
    },
    stateBox: {
      paddingVertical: 28,
      alignItems: 'center',
      gap: 8,
    },
    retryText: {
      marginTop: 4,
    },
  });
}
