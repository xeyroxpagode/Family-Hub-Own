/**
 * Planner V1 — M11 Presets/Drafts Frontend — Preset Library view state.
 *
 * Lane-owned PURE module used by the PresetLibrary screen and by the lane test
 * suite. Contains the visual-state classification, list partitioning and the
 * safe message mapping. NO React, NO fetches, NO RN imports — so the test
 * harness can drive it without rendering.
 */
import type { PlannerPreset } from '../../../types/plannerPresetsDrafts';
import {
  PRESET_SOURCES,
  isPlannerPresetSource,
} from '../../../services/planner/plannerPresetContracts';

/** Visual lifecycle state of the library, per §7. */
export type PresetLibraryVisualState =
  | 'initial_loading'
  | 'loaded'
  | 'empty'
  | 'refreshing_with_data_preserved'
  | 'stale'
  | 'offline'
  | 'partial_error'
  | 'fatal_safe_error';

/** Category filter (single tab across personal/household/homeplus). */
export type PresetLibraryFilter = 'all' | 'task' | 'event' | 'plan';

/** Partition the raw preset list into lifecycle-aware buckets. */
export type PresetLibraryPartitions = {
  readonly active: readonly PlannerPreset[];
  readonly trashed: readonly PlannerPreset[];
};

/** Compute the visual state purely from inputs. */
export function classifyPresetLibraryVisualState(input: {
  list: readonly PlannerPreset[] | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isOffline: boolean;
  isStale: boolean;
  errorKind: 'none' | 'partial' | 'fatal' | null;
}): PresetLibraryVisualState {
  const hasData = (input.list?.length ?? 0) > 0;
  if (input.isLoading && !hasData) return 'initial_loading';
  if (input.errorKind === 'fatal' && !hasData) return 'fatal_safe_error';
  if (input.errorKind === 'partial' && hasData) return 'partial_error';
  if (input.errorKind === 'fatal' && hasData) return 'partial_error';
  if (!hasData) return 'empty';
  if (input.isRefreshing) return 'refreshing_with_data_preserved';
  if (input.isOffline) return 'offline';
  if (input.isStale) return 'stale';
  return 'loaded';
}

/** Partition presets into `active` and `trashed` buckets. */
export function partitionPresets(
  presets: readonly PlannerPreset[],
): PresetLibraryPartitions {
  const active: PlannerPreset[] = [];
  const trashed: PlannerPreset[] = [];
  for (const preset of presets) {
    if (preset.trashed_at) trashed.push(preset);
    else active.push(preset);
  }
  return { active, trashed };
}

/** Filter presets by kind. */
export function filterPresetsByKind(
  presets: readonly PlannerPreset[],
  filter: PresetLibraryFilter,
): readonly PlannerPreset[] {
  if (filter === 'all') return presets;
  return presets.filter((p) => p.entity_type === filter);
}

/** Group presets by their source for the personal/household/homeplus labels. */
export function groupPresetsBySource(
  presets: readonly PlannerPreset[],
): Record<'homeplus' | 'personal' | 'household', PlannerPreset[]> {
  const buckets: Record<'homeplus' | 'personal' | 'household', PlannerPreset[]> = {
    homeplus: [],
    personal: [],
    household: [],
  };
  for (const preset of presets) {
    if (isPlannerPresetSource(preset.source)) {
      buckets[preset.source].push(preset);
    }
  }
  return buckets;
}

/** Safe localized label for an entity kind. */
export function presetKindSafeLabel(kind: PlannerPreset['entity_type']): string {
  switch (kind) {
    case 'task':
      return 'Tareas';
    case 'event':
      return 'Eventos';
    case 'plan':
      return 'Planes';
  }
}

/** Safe localized label for a source (HomePlus/presonal/household). */
export function presetSourceSafeLabel(source: PlannerPreset['source']): string {
  switch (source) {
    case 'homeplus':
      return 'HomePlus';
    case 'personal':
      return 'Personal';
    case 'household':
      return 'Familiar';
  }
}

/** Safe empty-state message. */
export const PRESET_LIBRARY_EMPTY_MESSAGE = 'Todavía no creaste ningún preset.';
/** Safe refresh-failure message. */
export const PRESET_LIBRARY_REFRESH_FAILED_MESSAGE = 'No pudimos actualizar la biblioteca.';
/** Safe partial-error message. */
export const PRESET_LIBRARY_PARTIAL_ERROR_MESSAGE = 'Algunos presets no se pudieron cargar.';
/** Safe fatal-error message. */
export const PRESET_LIBRARY_FATAL_MESSAGE = 'No pudimos cargar la biblioteca.';
