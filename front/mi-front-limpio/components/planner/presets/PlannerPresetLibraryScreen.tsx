/**
 * Planner V1 — M11 Presets/Drafts — Preset Library screen.
 *
 * P2.2A canonical shape (frozen):
 *   <  Biblioteca de presets                                +
 *
 *   DEL HOGAR            (household presets first — editable)
 *   Preset 1                                           >
 *
 *   --------------------------------------------------
 *
 *   DE HOMEPLUS          (system presets — read-only, duplicable)
 *   12 presets                                            ^
 *   Preset A                                           >
 *
 * Canonical presets are TASK presets only, in scopes homeplus | household.
 * Compatibility rows (personal scope, event/plan kinds, trashed items) remain
 * in storage but are NOT part of the canonical surface; the trash entry still
 * opens the lifecycle/trash surface for rows the user owns.
 *
 * Finance Categories is the visual donor: custom/household content first,
 * system content second, single continuous hierarchy, flat rows — no
 * card-per-preset, no kind tabs.
 *
 * Lane compliance retained from M11:
 * - Lifecycle-aware visual states with safe (non-technical) messages.
 * - Selecting a preset opens Detail; it NEVER creates an entity.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';

import { useAppTheme } from '../../../context/AppThemeContext';
import type { AppResolvedTheme } from '../../../constants/theme';
import { HomePlusIcon } from '../../../constants/icons';
import { AppText } from '../../ui/AppText';
import { useAuth } from '../../../context/AuthContext';
import { listPlannerPresets } from '../../../services/plannerPresets';
import { getTypeLabel } from '../../../screens/planner/plannerShared';
import {
  CANONICAL_PRESET_SECTION_TITLES,
  canonicalPresetLibraryGroups,
  classifyPresetLibraryVisualState,
  isCanonicalLibraryEmpty,
  partitionPresets,
  PRESET_LIBRARY_FATAL_MESSAGE,
  PRESET_LIBRARY_PARTIAL_ERROR_MESSAGE,
  PRESET_LIBRARY_REFRESH_FAILED_MESSAGE,
  type PresetLibraryVisualState,
} from './plannerPresetLibraryViewState';
import { presetTaskPayloadFromPreset } from '../../../services/planner/plannerPresetTaskDomain';
import type { PlannerPreset } from '../../../types/plannerPresetsDrafts';
import { PRESET_TYPE_OPTIONS, presetTypeIdFromPayload } from './PlannerPresetEditorScreen';
import { FilterChip } from '../../ui';

type Props = {
  onOpenPreset?: (preset: PlannerPreset) => void;
  onCreatePreset?: () => void;
  onOpenTrash?: () => void;
  onBack?: () => void;
  /** Optional accessToken override (for tests / Storybook). */
  accessTokenOverride?: string;
};

export function PlannerPresetLibraryScreen({
  onOpenPreset,
  onCreatePreset,
  onOpenTrash,
  onBack,
  accessTokenOverride,
}: Props) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const accessToken = accessTokenOverride ?? session?.access_token;

  const [presets, setPresets] = useState<readonly PlannerPreset[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStale] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [errorKind, setErrorKind] = useState<'none' | 'partial' | 'fatal' | null>('none');
  const [homeplusExpanded, setHomeplusExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  // P2.2A-R1 (defecto 2G): la biblioteca solo cargaba al montar. Al volver
  // con goBack desde Crear/Editar/Duplicar (el screen ya estaba montado en
  // el stack) la lista quedaba stale y el preset del hogar recién creado no
  // aparecía. Recarga única al recuperar foco, sin polling ni loops.
  const isFocused = useIsFocused();
  const wasFocusedRef = useRef(isFocused);

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
      setErrorKind('none');
    } catch (error) {
      const msg = error instanceof Error ? error.message.toLowerCase() : '';
      const offline = msg.includes('network') || msg.includes('fetch');
      setIsOffline(offline);
      setErrorKind('partial');
    } finally {
      setIsRefreshing(false);
    }
  }, [accessToken, isRefreshing]);

  useEffect(() => {
    void loadFresh();
  }, [loadFresh]);

  useEffect(() => {
    const wasFocused = wasFocusedRef.current;
    wasFocusedRef.current = isFocused;
    // Solo en transición desenfocado → enfocado (volver con goBack) y con
    // datos ya cargados: una recarga con datos preservados, sin spinner.
    if (isFocused && !wasFocused && presets !== null && !isLoading && !isRefreshing) {
      void refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

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

  const filteredPresets = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('es');
    return (presets ?? []).filter((preset) => {
      if (normalizedQuery && !preset.name.toLocaleLowerCase('es').includes(normalizedQuery)) return false;
      if (typeFilter === 'all') return true;
      const payload = presetTaskPayloadFromPreset(preset);
      return payload ? presetTypeIdFromPayload(payload) === typeFilter : false;
    });
  }, [presets, searchQuery, typeFilter]);
  const groups = useMemo(() => canonicalPresetLibraryGroups(filteredPresets), [filteredPresets]);
  const trashedCount = useMemo(() => partitionPresets(presets ?? []).trashed.length, [presets]);
  const canonicalEmpty = isCanonicalLibraryEmpty(groups);

  const showList =
    visualState === 'loaded'
    || visualState === 'empty'
    || visualState === 'refreshing_with_data_preserved'
    || visualState === 'partial_error'
    || visualState === 'offline'
    || visualState === 'stale';

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: 12 + insets.top * 0 }]}>
        {onBack ? (
          <Pressable
            style={styles.headerIconBtn}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <HomePlusIcon name="chevron-back" size={22} color={colors.text.primary} />
          </Pressable>
        ) : null}
        <AppText variant="title2" weight="800" style={styles.headerTitle}>
          Biblioteca de presets
        </AppText>
        {onCreatePreset ? (
          <Pressable
            style={styles.headerIconBtn}
            onPress={onCreatePreset}
            accessibilityRole="button"
            accessibilityLabel="Nuevo preset"
          >
            <HomePlusIcon name="add" size={24} color={colors.text.primary} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.searchWrap}>
          <HomePlusIcon name="search" size={18} color={colors.text.tertiary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar presets"
            placeholderTextColor={colors.text.muted}
            accessibilityLabel="Buscar presets"
            style={[styles.searchInput, { color: colors.text.primary }]}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')} accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" style={styles.clearSearch}>
              <HomePlusIcon name="close-circle" size={18} color={colors.text.tertiary} />
            </Pressable>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <FilterChip label="Todos" selected={typeFilter === 'all'} onPress={() => setTypeFilter('all')} />
          {PRESET_TYPE_OPTIONS.map((option) => (
            <FilterChip key={option.id} label={option.label} selected={typeFilter === option.id} onPress={() => setTypeFilter(option.id)} />
          ))}
        </ScrollView>
        {visualState === 'initial_loading' ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.terracotta[500]} />
          </View>
        ) : null}

        {visualState === 'fatal_safe_error' ? (
          <SafeErrorBox message={PRESET_LIBRARY_FATAL_MESSAGE} onRetry={() => void loadFresh()} />
        ) : null}

        {visualState === 'partial_error' ? (
          <SafeErrorBox message={PRESET_LIBRARY_PARTIAL_ERROR_MESSAGE} onRetry={() => void refresh()} />
        ) : null}

        {visualState === 'offline' ? (
          <AppText variant="bodySmall" tone="tertiary" style={styles.inlineNote}>
            Sin conexión. Mostramos lo que tenemos guardado.
          </AppText>
        ) : null}

        {visualState === 'refreshing_with_data_preserved' ? (
          <AppText variant="caption" tone="tertiary" style={styles.inlineNote}>
            {PRESET_LIBRARY_REFRESH_FAILED_MESSAGE}
          </AppText>
        ) : null}

        {showList && canonicalEmpty ? (
          <View style={styles.centerState}>
            <AppText variant="body" tone="tertiary" align="center">
              {searchQuery || typeFilter !== 'all'
                ? 'No hay presets que coincidan con esta búsqueda.'
                : 'Todavía no tenés presets.\nCreá el primero con el + de arriba.'}
            </AppText>
          </View>
        ) : null}

        {showList && !canonicalEmpty ? (
          <View>
            {groups.household.length > 0 ? (
              <PresetFlatSection
                title={CANONICAL_PRESET_SECTION_TITLES.household}
                presets={groups.household}
                onOpenPreset={onOpenPreset}
              />
            ) : null}

            {groups.household.length > 0 && groups.homeplus.length > 0 ? (
              <View style={styles.sectionDivider} />
            ) : null}

            {groups.homeplus.length > 0 ? (
              <View>
                <Pressable
                  style={styles.homeplusHeader}
                  onPress={() => setHomeplusExpanded((value) => !value)}
                  accessibilityRole="button"
                  accessibilityLabel={`${CANONICAL_PRESET_SECTION_TITLES.homeplus}, ${groups.homeplus.length} presets`}
                >
                  <AppText variant="caption" weight="800" style={styles.sectionTitle}>
                    {CANONICAL_PRESET_SECTION_TITLES.homeplus}
                  </AppText>
                  <View style={styles.homeplusHeaderRight}>
                    <AppText variant="caption" tone="tertiary">
                      {`${groups.homeplus.length} presets`}
                    </AppText>
                    <HomePlusIcon
                      name={homeplusExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.text.tertiary}
                    />
                  </View>
                </Pressable>
                {homeplusExpanded ? (
                  <PresetFlatRows presets={groups.homeplus} onOpenPreset={onOpenPreset} readOnlyMark />
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {trashedCount > 0 && onOpenTrash ? (
          <Pressable
            style={styles.trashLink}
            onPress={onOpenTrash}
            accessibilityRole="button"
            accessibilityLabel="Ver papelera de presets"
          >
            <HomePlusIcon name="trash" size={16} color={colors.text.tertiary} />
            <AppText variant="bodySmall" tone="tertiary">
              {`Papelera (${trashedCount})`}
            </AppText>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function PresetFlatSection({
  title,
  presets,
  onOpenPreset,
}: {
  title: string;
  presets: readonly PlannerPreset[];
  onOpenPreset?: (preset: PlannerPreset) => void;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View>
      <AppText variant="caption" weight="800" style={styles.sectionTitle}>
        {title}
      </AppText>
      <PresetFlatRows presets={presets} onOpenPreset={onOpenPreset} />
    </View>
  );
}

function PresetFlatRows({
  presets,
  onOpenPreset,
  readOnlyMark = false,
}: {
  presets: readonly PlannerPreset[];
  onOpenPreset?: (preset: PlannerPreset) => void;
  readOnlyMark?: boolean;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View>
      {presets.map((preset) => {
        const payload = presetTaskPayloadFromPreset(preset);
        const typeLabel = payload ? getTypeLabel(payload.template_key, payload.category) : null;
        const metaParts: string[] = [];
        if (typeLabel) metaParts.push(typeLabel);
        if (payload && payload.checklist.length > 0) metaParts.push(`${payload.checklist.length} pasos`);
        const meta = metaParts.join(' · ');
        return (
          <Pressable
            key={preset.id}
            style={styles.row}
            onPress={() => onOpenPreset?.(preset)}
            accessibilityRole="button"
            accessibilityLabel={`Abrir preset ${preset.name}`}
          >
            <View style={styles.rowContent}>
              <AppText variant="body" weight="600" numberOfLines={1}>
                {preset.name}
              </AppText>
              {meta ? (
                <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                  {meta}
                </AppText>
              ) : null}
            </View>
            {readOnlyMark ? (
              <AppText variant="caption" tone="tertiary" style={styles.readOnlyTag}>
                Solo lectura
              </AppText>
            ) : null}
            <HomePlusIcon name="chevron-forward" size={18} color={colorsTextTertiary(theme)} />
          </Pressable>
        );
      })}
    </View>
  );
}

function colorsTextTertiary(theme: AppResolvedTheme) {
  return theme.colors.text.tertiary;
}

function SafeErrorBox({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.errorBox}>
      <AppText variant="bodySmall" tone="warning" weight="700" style={styles.errorBoxText}>
        {message}
      </AppText>
      {onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Reintentar">
          <AppText variant="bodySmall" weight="700" style={{ color: colors.terracotta[600] }}>
            Reintentar
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(theme: AppResolvedTheme) {
  const { colors } = theme;
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background.base,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingBottom: 10,
    },
    headerTitle: {
      flex: 1,
    },
    headerIconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface.soft,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 96,
    },
    searchWrap: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border.default,
      backgroundColor: colors.surface.card,
      marginBottom: 8,
    },
    searchInput: { flex: 1, minHeight: 44, fontSize: 15, paddingVertical: 8 },
    clearSearch: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -12 },
    filters: { gap: 8, paddingBottom: 8 },
    centerState: {
      paddingVertical: 48,
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    inlineNote: {
      marginBottom: 10,
    },
    sectionTitle: {
      color: colors.text.secondary,
      letterSpacing: 0.5,
      marginTop: 14,
      marginBottom: 2,
    },
    sectionDivider: {
      height: 1,
      backgroundColor: colors.border.subtle,
      marginVertical: 14,
    },
    homeplusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
      paddingVertical: 6,
    },
    homeplusHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 52,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border.subtle,
    },
    rowContent: {
      flex: 1,
      gap: 2,
    },
    readOnlyTag: {
      marginRight: 2,
    },
    trashLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 20,
      paddingVertical: 6,
    },
    errorBox: {
      backgroundColor: colors.warning.soft,
      borderColor: colors.warning.base,
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      marginVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    errorBoxText: {
      flex: 1,
    },
  });
}
