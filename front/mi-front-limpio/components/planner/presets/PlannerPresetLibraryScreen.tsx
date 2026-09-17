/**
 * Planner V1 — M11 Presets/Drafts Frontend — Preset Library screen.
 *
 * Lane-owned. Lists Presets personally/household/homeplus-partitioned with
 * active vs trashed sections, lifecycle-aware visual state and safe error
 * messages. This screen is NOT registered in the global navigator; the lane
 * publishes a route descriptor in
 * `navigation/plannerPresetDraftsRouteDescriptors.tsx` for Integration to wire.
 *
 * Compliance:
 * - Does NOT add a fourth Planner tab.
 * - Does NOT modify shared files.
 * - Does NOT broadcast Preset selection as entity creation. Selecting opens
 *   Detail/Preview, never creates anything.
 * - Privacy: no UUID/SQLSTATE/payload shown; only safe labels.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TouchableOpacity, View } from 'react-native';

import { plannerStyles as S } from '../../../screens/planner/plannerShared';
import { AppText } from '../../ui/AppText';
import { useAuth } from '../../../context/AuthContext';
import { useHousehold } from '../../../context/HouseholdContext';
import { listPlannerPresets } from '../../../services/plannerPresets';
import {
  classifyPresetLibraryVisualState,
  filterPresetsByKind,
  partitionPresets,
  presetKindSafeLabel,
  presetSourceSafeLabel,
  groupPresetsBySource,
  PRESET_LIBRARY_EMPTY_MESSAGE,
  PRESET_LIBRARY_FATAL_MESSAGE,
  PRESET_LIBRARY_PARTIAL_ERROR_MESSAGE,
  PRESET_LIBRARY_REFRESH_FAILED_MESSAGE,
  type PresetLibraryFilter,
  type PresetLibraryVisualState,
} from './plannerPresetLibraryViewState';
import type { PlannerPreset } from '../../../types/plannerPresetsDrafts';

type Props = {
  onOpenPreset?: (preset: PlannerPreset) => void;
  onCreatePreset?: () => void;
  onOpenTrash?: () => void;
  /** Optional accessToken override (for tests / Storybook). */
  accessTokenOverride?: string;
};

export function PlannerPresetLibraryScreen({
  onOpenPreset,
  onCreatePreset,
  onOpenTrash,
  accessTokenOverride,
}: Props) {
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const accessToken = accessTokenOverride ?? session?.access_token;

  const [presets, setPresets] = useState<readonly PlannerPreset[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [errorKind, setErrorKind] = useState<'none' | 'partial' | 'fatal' | null>('none');
  const [filter, setFilter] = useState<PresetLibraryFilter>('all');

  const loadFresh = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false);
      setErrorKind('fatal');
      return;
    }
    setIsLoading(true);
    setErrorKind('none');
    try {
      const response = await listPlannerPresets(accessToken, {
        include_trashed: true,
      });
      setPresets(response.presets);
      setIsStale(false);
      setIsOffline(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message.toLowerCase() : '';
      const offline = msg.includes('network') || msg.includes('fetch');
      setIsOffline(offline);
      setErrorKind(offline ? 'partial' : 'fatal');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  const refresh = useCallback(async () => {
    if (!accessToken || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const response = await listPlannerPresets(accessToken, {
        include_trashed: true,
      });
      setPresets(response.presets);
      setIsStale(false);
      setErrorKind('none');
    } catch (error) {
      const msg = error instanceof Error ? error.message.toLowerCase() : '';
      const offline = msg.includes('network') || msg.includes('fetch');
      setIsOffline(offline);
      setErrorKind(offline ? 'partial' : 'partial');
    } finally {
      setIsRefreshing(false);
    }
  }, [accessToken, isRefreshing]);

  useEffect(() => {
    void loadFresh();
  }, [loadFresh]);

  const visualState: PresetLibraryVisualState = useMemo(
    () =>
      classifyPresetLibraryVisualState({
        list: presets,
        isLoading,
        isRefreshing,
        isStale,
        isOffline,
        errorKind,
      }),
    [presets, isLoading, isRefreshing, isStale, isOffline, errorKind],
  );

  const partitions = useMemo(
    () => partitionPresets(presets ?? []),
    [presets],
  );
  const activeFiltered = useMemo(
    () => filterPresetsByKind(partitions.active, filter),
    [partitions.active, filter],
  );
  const activeBySource = useMemo(
    () => groupPresetsBySource(activeFiltered),
    [activeFiltered],
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <AppText variant="title2" weight="700" style={{ flex: 1 }}>
          Biblioteca de presets
        </AppText>
        {onCreatePreset ? (
          <TouchableOpacity onPress={onCreatePreset} accessibilityRole="button" accessibilityLabel="Crear nuevo preset">
            <AppText variant="body" weight="700" tone="primary">
              + Nuevo
            </AppText>
          </TouchableOpacity>
        ) : null}
      </View>

      <FilterBar filter={filter} onChange={setFilter} />

      {visualState === 'initial_loading' ? (
        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : null}

      {visualState === 'fatal_safe_error' ? (
        <SafeErrorBox message={PRESET_LIBRARY_FATAL_MESSAGE} onRetry={() => void loadFresh()} />
      ) : null}

      {visualState === 'partial_error' ? (
        <SafeErrorBox
          message={PRESET_LIBRARY_PARTIAL_ERROR_MESSAGE}
          onRetry={currentHousehold ? () => void refresh() : undefined}
          canRetry={currentHousehold !== undefined}
        />
      ) : null}

      {visualState === 'empty' ? (
        <AppText variant="body" tone="tertiary" style={{ marginTop: 16 }}>
          {PRESET_LIBRARY_EMPTY_MESSAGE}
        </AppText>
      ) : null}

      {visualState === 'offline' ? (
        <AppText variant="bodySmall" tone="tertiary">
          Sin conexión. Mostramos lo que tenemos guardado.
        </AppText>
      ) : null}

      {visualState === 'stale' ? (
        <AppText variant="micro" tone="tertiary">
          Datos en revisión. Actualizá cuando puedas.
        </AppText>
      ) : null}

      {visualState === 'loaded'
        || visualState === 'refreshing_with_data_preserved'
        || visualState === 'partial_error'
        || visualState === 'offline'
        || visualState === 'stale' ? (
        <View style={{ marginTop: 12 }}>
          <PresetSection
            title="HomePlus"
            presets={activeBySource.homeplus}
            onOpenPreset={onOpenPreset}
            readOnly
          />
          <PresetSection
            title="Personal"
            presets={activeBySource.personal}
            onOpenPreset={onOpenPreset}
          />
          <PresetSection
            title="Familiar"
            presets={activeBySource.household}
            onOpenPreset={onOpenPreset}
          />
          {partitions.trashed.length > 0 && onOpenTrash ? (
            <TouchableOpacity
              style={{ marginTop: 16 }}
              onPress={onOpenTrash}
              accessibilityRole="button"
              accessibilityLabel="Ver papelera de presets"
            >
              <AppText variant="bodySmall" tone="tertiary">
                Papelera ({partitions.trashed.length})
              </AppText>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {visualState === 'refreshing_with_data_preserved' ? (
        <AppText variant="micro" tone="tertiary" style={{ marginBottom: 8 }}>
          {PRESET_LIBRARY_REFRESH_FAILED_MESSAGE}
        </AppText>
      ) : null}
    </ScrollView>
  );
}

function FilterBar({
  filter,
  onChange,
}: {
  filter: PresetLibraryFilter;
  onChange: (next: PresetLibraryFilter) => void;
}) {
  const tabs: PresetLibraryFilter[] = ['all', 'task', 'event', 'plan'];
  const labels: Record<PresetLibraryFilter, string> = {
    all: 'Todos',
    task: 'Tareas',
    event: 'Eventos',
    plan: 'Planes',
  };
  return (
    <View style={{ flexDirection: 'row', marginBottom: 12 }}>
      {tabs.map((tab) => {
        const active = tab === filter;
        return (
          <TouchableOpacity
            key={tab}
            onPress={() => onChange(tab)}
            accessibilityRole="button"
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: active ? '#2B6CB0' : 'transparent',
              marginRight: 8,
            }}
          >
            <AppText variant="bodySmall" weight="700" tone={active ? 'inverse' : 'tertiary'}>
              {labels[tab]}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function PresetSection({
  title,
  presets,
  onOpenPreset,
  readOnly,
}: {
  title: string;
  presets: readonly PlannerPreset[];
  onOpenPreset?: (preset: PlannerPreset) => void;
  readOnly?: boolean;
}) {
  if (presets.length === 0) return null;
  return (
    <View style={{ marginBottom: 16 }}>
      <AppText variant="bodySmall" weight="700" style={{ marginBottom: 6 }}>
        {title}
      </AppText>
      {presets.map((preset) => (
        <Pressable
          key={preset.id}
          onPress={() => onOpenPreset?.(preset)}
          accessibilityRole="button"
          accessibilityLabel={`Abrir preset ${preset.name}`}
        >
          <View style={S.row}>
            <AppText variant="body" weight="600" style={{ flex: 1 }}>
              {preset.name}
            </AppText>
            <AppText variant="micro" tone="tertiary">
              {presetKindSafeLabel(preset.entity_type)} · {presetSourceSafeLabel(preset.source)}
              {readOnly ? ' · Solo lectura' : ''}
            </AppText>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function SafeErrorBox({
  message,
  onRetry,
  canRetry,
}: {
  message: string;
  onRetry?: () => void;
  canRetry?: boolean;
}) {
  return (
    <View style={S.toastBox}>
      <AppText variant="bodySmall" tone="warning" weight="700" style={{ flex: 1 }}>
        {message}
      </AppText>
      {canRetry && onRetry ? (
        <TouchableOpacity onPress={onRetry} accessibilityRole="button" accessibilityLabel="Reintentar">
          <AppText variant="bodySmall" tone="primary" weight="700">
            Reintentar
          </AppText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
