/**
 * Planner V1 — M11 Presets/Drafts Frontend — local Preset Trash surface.
 *
 * Lane-owned surface that shows trashed presets only. Drafts no longer enter
 * Trash under CR-M11-11A-GLOBAL-SURFACES-001; Draft discard is definitive.
 *
 * Privacy & safety:
 *  - Shows only safe labels (no UUID/SQLSTATE/payload).
 *  - Restore invalidates the relevant queries via the published
 *    `plannerCache.invalidateKind(kind, scope)` (lane-owned, never touches the
 *    shared mutation enum).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';

import { plannerStyles as S } from '../../../screens/planner/plannerShared';
import { AppText } from '../../ui/AppText';
import { useAuth } from '../../../context/AuthContext';
import { useHousehold } from '../../../context/HouseholdContext';
import {
  listPlannerPresets,
} from '../../../services/plannerPresets';
import {
  enqueuePlannerPresetRestore,
} from '../../../services/planner/reliability';
import type { PlannerPreset } from '../../../types/plannerPresetsDrafts';
import type { HouseholdScope } from '../../../services/planner/plannerKeys';
import { plannerCache } from '../../../services/planner/plannerCache';

type Props = {
  accessTokenOverride?: string;
};

export function PlannerPresetDraftsTrashScreen({ accessTokenOverride }: Props) {
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const accessToken = accessTokenOverride ?? session?.access_token;

  const [trashedPresets, setTrashedPresets] = useState<readonly PlannerPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorKind, setErrorKind] = useState<'none' | 'partial' | 'fatal'>('none');

  const scope = useMemo<HouseholdScope | null>(
    () => (currentHousehold ? { householdId: currentHousehold.id } : null),
    [currentHousehold],
  );

  const loadFresh = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      setErrorKind('fatal');
      return;
    }
    setLoading(true);
    setErrorKind('none');
    try {
      const presets = await listPlannerPresets(accessToken, { include_trashed: true });
      setTrashedPresets((presets.presets ?? []).filter((p) => p.trashed_at));
    } catch {
      setErrorKind('partial');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadFresh();
  }, [loadFresh]);

  const handleRestorePreset = useCallback(
    async (preset: PlannerPreset) => {
      if (!accessToken || !preset.version) return;
      try {
        await enqueuePlannerPresetRestore(preset.id, {
          expectedVersion: preset.version,
          mutationId: `preset_restore_${preset.id}`,
          idempotencyKey: `preset_restore_${preset.id}_${preset.version}`,
        });
        if (scope) {
          plannerCache.invalidateKind('presets', scope);
        }
        await loadFresh();
      } catch {
        setErrorKind('partial');
      }
    },
    [accessToken, scope, loadFresh],
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <AppText variant="title2" weight="700">
        Papelera
      </AppText>
      {loading ? (
        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : null}
      {errorKind !== 'none' ? (
        <View style={[S.toastBox, { marginTop: 8 }]}>
          <AppText variant="bodySmall" tone="warning" style={{ flex: 1 }}>
            No pudimos actualizar la papelera.
          </AppText>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Reintentar" onPress={() => void loadFresh()}>
            <AppText variant="bodySmall" tone="primary" weight="700">
              Reintentar
            </AppText>
          </TouchableOpacity>
        </View>
      ) : null}
      {trashedPresets.length === 0 && !loading && errorKind === 'none' ? (
        <AppText variant="body" tone="tertiary" style={{ marginTop: 12 }}>
          La papelera está vacía.
        </AppText>
      ) : null}
      {trashedPresets.length > 0 ? (
        <View style={{ marginTop: 12 }}>
          <AppText variant="bodySmall" weight="700" style={{ marginBottom: 6 }}>
            Presets
          </AppText>
          {trashedPresets.map((preset) => (
            <View key={preset.id} style={[S.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
              <AppText variant="body" style={{ flex: 1 }}>
                {preset.name}
              </AppText>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Restaurar preset ${preset.name}`}
                onPress={() => void handleRestorePreset(preset)}
                style={blueAction}
              >
                <AppText variant="bodySmall" tone="inverse" weight="700">
                  Restaurar
                </AppText>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}
      <AppText variant="micro" tone="tertiary" style={{ marginTop: 16 }}>
        Los elementos en la papelera se eliminan definitivamente según la
        configuración del hogar.
      </AppText>
    </ScrollView>
  );
}

const blueAction = {
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 16,
  backgroundColor: '#2B6CB0',
  marginLeft: 8,
};
