/**
 * Planner P2.2A — Presets Foundation — Quick Rail contract component.
 *
 * Reusable horizontal rail of the most useful presets for the current
 * context. P2.2A provides ONLY the contract/component:
 *
 *   Presets                                          Ver todos
 *   [Compras] [Factura] [Llamar] [Medicamentos]   →
 *
 * - Single horizontal row.
 * - Deterministic small result set chosen by the caller through
 *   `selectQuickPresets` (household presets preferred; HomePlus fills the
 *   remaining slots).
 * - "Ver todos" opens the Preset Picker (caller-owned).
 * - Tap returns the preset to the caller — this component never creates a
 *   Task, never navigates by itself and never edits data.
 *
 * P2.2B will redesign "Nueva tarea" and decide the rail's final placement.
 */
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useAppTheme } from '../../../context/AppThemeContext';
import type { AppResolvedTheme } from '../../../constants/theme';
import { HomePlusIcon } from '../../../constants/icons';
import { AppText } from '../../ui';
import type { PlannerPreset } from '../../../types/plannerPresetsDrafts';

export type PresetQuickRailProps = {
  /** Deterministic small ordered subset (caller applies selectQuickPresets). */
  readonly presets: readonly PlannerPreset[];
  readonly onSelect: (preset: PlannerPreset) => void;
  /** "Ver todos" — opens the full Preset Picker. */
  readonly onShowAll: () => void;
  readonly title?: string;
  /** The selected card can be tapped again to undo the application. */
  readonly selectedPresetId?: string | null;
};

export function PresetQuickRail({
  presets,
  onSelect,
  onShowAll,
  title = 'Desde un preset',
  selectedPresetId = null,
}: PresetQuickRailProps) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (presets.length === 0) return null;

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <AppText variant="caption" weight="800" style={styles.title}>
          {title}
        </AppText>
        <Pressable
          onPress={onShowAll}
          accessibilityRole="button"
          accessibilityLabel="Ver todos los presets"
          style={styles.showAllBtn}
        >
          <AppText variant="bodySmall" weight="700" tone="brand">
            Ver todos
          </AppText>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {presets.map((preset) => (
          <Pressable
            key={preset.id}
            style={[
              styles.chip,
              preset.source === 'homeplus' ? styles.chipHomeplus : styles.chipHousehold,
              selectedPresetId === preset.id && styles.chipSelected,
            ]}
            onPress={() => onSelect(preset)}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedPresetId === preset.id }}
            accessibilityLabel={selectedPresetId === preset.id ? `Quitar preset ${preset.name}` : `Usar preset ${preset.name}`}
          >
            <AppText variant="bodySmall" weight="700" style={styles.chipText} numberOfLines={2}>
              {preset.name}
            </AppText>
            <HomePlusIcon name="chevron-forward" size={14} color={colors.text.tertiary} />
          </Pressable>
        ))}
        <Pressable
          style={[styles.card, styles.newCard]}
          onPress={onShowAll}
          accessibilityRole="button"
          accessibilityLabel="Crear o elegir un preset"
        >
          <HomePlusIcon name="add" size={18} color={colors.terracotta[600]} />
          <AppText variant="caption" weight="700" style={styles.newCardText} numberOfLines={2}>Nuevo preset</AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function createStyles(theme: AppResolvedTheme) {
  const { colors } = theme;
  return StyleSheet.create({
    root: {
      marginBottom: 16,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    title: {
      color: colors.text.secondary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      fontSize: 12,
    },
    showAllBtn: {
      paddingVertical: 2,
      paddingHorizontal: 4,
    },
    rail: {
      flexDirection: 'row',
      gap: 8,
      paddingRight: 8,
    },
    chip: {
      width: 96,
      height: 72,
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      borderRadius: 16,
      borderWidth: 1,
      padding: 10,
    },
    chipHousehold: {
      backgroundColor: colors.surface.card,
      borderColor: colors.border.default,
    },
    chipHomeplus: {
      backgroundColor: colors.terracotta[50],
      borderColor: colors.terracotta[100],
    },
    chipText: {
      color: colors.text.primary,
    },
    chipSelected: {
      borderColor: colors.terracotta[600],
      borderWidth: 2,
    },
    card: { width: 96, height: 72, borderRadius: 16, borderWidth: 1, padding: 10, justifyContent: 'space-between' },
    newCard: { borderColor: colors.terracotta[100], backgroundColor: colors.terracotta[50] },
    newCardText: { color: colors.terracotta[700] },
  });
}
