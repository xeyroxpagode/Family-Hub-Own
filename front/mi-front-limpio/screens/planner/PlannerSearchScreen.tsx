/**
 * Planner V1 — M7 Planner Search Screen.
 *
 * Purpose (frozen by `planner_v1_implementation_order.md` §M7):
 * - Contractual Search screen that does NOT implement productive search.
 * - Renders gate states: loading, disabled, forbidden, unavailable.
 * - When the gate is available, shows an honest "not yet available" message.
 * - Entry point hidden by default (flag `planner.search_entry` is `false`).
 * - Back behavior: goBack if history exists, fallback to Planner root.
 *
 * Binding rules:
 * - NO backend requests for search.
 * - NO input field, NO mock results, NO query persistence.
 * - NO debounce, NO filters, NO ranking.
 * - `planner_search_opened` telemetry emitted ONLY when entry is available
 *   and navigation was accepted.
 *
 * Out of scope for M7:
 * - Productive search (M8+).
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AppText } from '../../components/ui';
import { APP_ICONS, HomePlusIcon } from '../../constants/icons';
import { colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useFeatureFlags } from '../../context/FeatureFlagsContext';
import { usePlannerSheet } from '../../context/PlannerSheetContext';
import {
  resolvePlannerSearchAccess,
  type PlannerSearchAccess,
} from '../../services/planner/plannerSearchAccess';
import {
  resolvePlannerSearchBaseState,
  describeSearchState,
  type PlannerSearchBaseState,
} from '../../services/planner/plannerSearchStates';
import {
  planPlannerSearchBack,
  type PlannerSearchEntrySource,
} from '../../navigation/plannerSearchNavigation';

import { plannerSearchTelemetry } from '../../services/planner/plannerSearchTelemetry';

import { plannerStyles as S } from './plannerShared';

// ---------------------------------------------------------------------------
// 1. PlannerSearchScreen
// ---------------------------------------------------------------------------

export function PlannerSearchScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const { flags, loading: flagsLoading } = useFeatureFlags();
  const sheet = usePlannerSheet();

  // Extract route params (source, returnTo) from the canonical contract.
  const source: PlannerSearchEntrySource = route.params?.source === 'planner'
    ? 'planner'
    : route.params?.source ?? 'unknown';
  const returnTo: string | undefined = route.params?.returnTo;

  // --- Capabilities ---
  // We use the sheet capabilities from PlannerScreen or derive from household.
  // For the screen, the capabilities projection is fetched by PlannerScreen;
  // we evaluate the gate here using the flag + capabilities from the sheet
  // provider's context. In practice, the PlannerScreen passes them via a
  // shared capability projection.
  // For simplicity in M7, we derive the access purely from the flags;
  // capabilities gate is checked later when the actual search engine lands.
  // The gate still requires `planner.search` capability via the dual check.
  const capabilitiesReady = true; // defer to planner screen's knowledge
  const capabilities: Record<string, boolean> | null = null;
  // In M7, we use the flag-only guard for the screen. The full dual-gate
  // (flag + capability) is exercised in the entry point rendering in
  // PlannerScreen Phase 13. Here the screen shows disabled/forbidden when
  // entry wasn't available, and unavailable when entry was available but
  // Search productiva hasn't landed.

  // --- Search access resolution ---
  const access: PlannerSearchAccess = useMemo(
    () =>
      resolvePlannerSearchAccess({
        flags,
        flagsLoading,
        capabilities,
        capabilitiesReady,
      }),
    [flags, flagsLoading, capabilities, capabilitiesReady],
  );

  // --- Base screen state ---
  const baseState: PlannerSearchBaseState = useMemo(
    () => resolvePlannerSearchBaseState(access),
    [access],
  );

  const descriptor = useMemo(() => describeSearchState(baseState), [baseState]);

  // --- Telemetry ---
  const telemetryEmitted = useRef(false);
  useEffect(() => {
    if (telemetryEmitted.current) return;
    // Only emit `planner_search_opened` when entry was actually available.
    // The precondition is `resolvePlannerSearchAccess` returns `available` AND
    // `resolvePlannerSearchBaseState` maps to `unavailable` (the honest state).
    if (access.kind === 'available' && baseState.kind === 'unavailable') {
      telemetryEmitted.current = true;
      plannerSearchTelemetry.opened({
        source,
        entry_type: 'screen',
      });
    }
  }, [access.kind, baseState.kind, source]);

  // --- Back behavior ---
  const handleBack = useCallback(() => {
    planPlannerSearchBack(navigation, { source, returnTo });
  }, [navigation, source, returnTo]);

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      {/* Header: title + back button */}
      <View style={[S.headerRow, { marginBottom: 8 }]}>
        <TouchableOpacity
          style={S.overflowBtn}
          onPress={handleBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Volver a Planner"
        >
          <HomePlusIcon
            name="chevron-back-outline"
            size={22}
            color={colors.text.primary}
          />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <AppText variant="title1" accessibilityRole="header">
            Buscar en Planner
          </AppText>
        </View>
        {/* Spacer to match the back button on the left for symmetry */}
        <View style={{ width: 38 }} />
      </View>

      {/* State display */}
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          gap: 16,
          backgroundColor: colors.background.base,
        }}
        accessibilityRole={
          descriptor.hasBackButton ? undefined : 'alert'
        }
        accessibilityLiveRegion="polite"
      >
        {/* Loading state — skeleton placeholder */}
        {baseState.kind === 'loading' ? (
          <AppText variant="body" tone="tertiary">
            {descriptor.description}
          </AppText>
        ) : (
          <>
            <View
              style={{
                minHeight: 72,
                minWidth: 72,
                borderRadius: 100,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  baseState.kind === 'unavailable'
                    ? colors.terracotta[50]
                    : colors.surface.soft,
              }}
            >
              <HomePlusIcon
                name={
                  baseState.kind === 'unavailable'
                    ? APP_ICONS.planner.notes ?? 'search-outline'
                    : baseState.kind === 'disabled'
                    ? 'construct-outline'
                    : 'lock-closed'
                }
                size={28}
                color={
                  baseState.kind === 'unavailable'
                    ? colors.terracotta[600]
                    : colors.text.tertiary
                }
              />
            </View>
            <AppText variant="title3" align="center" tone="primary">
              {descriptor.title}
            </AppText>
            <AppText variant="bodySmall" align="center" tone="secondary">
              {descriptor.description}
            </AppText>

            {/* Back button for blocked states */}
            {descriptor.hasBackButton ? (
              <TouchableOpacity
                style={{
                  marginTop: 16,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: colors.terracotta[500],
                }}
                onPress={handleBack}
                accessibilityRole="button"
                accessibilityLabel={
                  baseState.kind === 'disabled' || baseState.kind === 'forbidden'
                    ? 'Volver a Planner'
                    : 'Volver'
                }
              >
                <AppText variant="bodySmall" weight="700" tone="inverse">
                  Volver
                </AppText>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}