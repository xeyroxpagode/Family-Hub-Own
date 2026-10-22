/**
 * HOMePLUS Planner — S9: the linked SOURCE row of a Task / Event.
 *
 * A Planner item created from an Asset carries the server-side origin
 * reference (origin_module='assets', origin_entity_type='asset',
 * origin_entity_id=<uuid>). This row is the honest answer to "what is this
 * item about?": it shows the NAME of the originating Asset and opens it.
 *
 * SECURITY (frozen):
 *   - The name is read through the ASSETS authority with the caller's OWN
 *     token: seeing a Planner item NEVER implies seeing its Asset.
 *   - If the Asset is not visible (or no longer exists), the row says
 *     "Activo no disponible" and it is NOT clickable. The UUID is NEVER
 *     shown as a fallback label.
 *   - No Asset data is copied into Planner: there is no duplicated payload,
 *     no FK and no cross-domain resolver framework.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '../ui/AppText';
import { InteractivePressable } from '../ui/InteractivePressable';
import { getAssetLinkLabel, type AssetLinkLabel } from '../../services/assets/client';

/** The frozen copy of the honest "not available" state. */
export const PLANNER_ASSET_SOURCE_UNAVAILABLE = 'Activo no disponible';

/** The frozen copy of the transient failure state. */
export const PLANNER_ASSET_SOURCE_UNREACHABLE = 'No pudimos consultarlo';

/** The origin reference that means "this item comes from an Asset". */
export type PlannerAssetOrigin = {
  origin_module?: string | null;
  origin_entity_type?: string | null;
  origin_entity_id?: string | null;
};

/**
 * The Asset id of an origin reference, or null when the item does NOT come
 * from an Asset.
 */
export function plannerAssetOriginId(
  origin: PlannerAssetOrigin | null | undefined,
): string | null {
  if (!origin) return null;
  if (origin.origin_module !== 'assets') return null;
  if (origin.origin_entity_type !== 'asset') return null;
  const id = origin.origin_entity_id;
  if (typeof id !== 'string' || id.trim() === '') return null;
  return id;
}

export function PlannerAssetSourceRow({
  accessToken,
  origin,
  onOpenAsset,
}: {
  accessToken: string | null | undefined;
  origin: PlannerAssetOrigin | null | undefined;
  /** Opens the Asset detail (the navigation is owned by the host screen). */
  onOpenAsset?: (assetId: string) => void;
}) {
  const assetId = plannerAssetOriginId(origin);
  const [label, setLabel] = useState<AssetLinkLabel | null>(null);
  // The state is HONEST: 'loading' is not "not available", and a transport
  // failure is not "not available" either (it can be retried).
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'unavailable' | 'error'>(
    'idle',
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!assetId) {
      setLabel(null);
      setState('idle');
      return;
    }
    if (!accessToken) {
      setLabel(null);
      setState('unavailable');
      return;
    }
    let cancelled = false;
    setLabel(null);
    setState('loading');
    void getAssetLinkLabel(accessToken, assetId)
      .then((result) => {
        if (cancelled) return;
        setLabel(result);
        setState('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        setLabel(null);
        const status =
          error && typeof error === 'object' && 'status' in error
            ? Number((error as { status: unknown }).status)
            : null;
        // 404 (unknown or other household) and 403 (no assets.view) are
        // PERMANENT for this caller: the honest answer is "not available".
        // Anything else (network, 5xx) is transient and can be retried.
        setState(status === 404 || status === 403 ? 'unavailable' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, assetId, attempt]);

  const open = useCallback(() => {
    if (!assetId || !label) return;
    onOpenAsset?.(assetId);
  }, [assetId, label, onOpenAsset]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (!assetId) return null;

  const canOpen = Boolean(label) && typeof onOpenAsset === 'function';

  return (
    <View style={styles.row}>
      <AppText variant="caption" tone="tertiary" style={styles.label}>
        Activo
      </AppText>
      {state === 'loading' ? (
        <AppText variant="caption" tone="tertiary" style={styles.value}>
          Buscando…
        </AppText>
      ) : state === 'error' ? (
        <View style={styles.valueButton}>
          <AppText variant="caption" weight="700" tone="secondary">
            {PLANNER_ASSET_SOURCE_UNREACHABLE}
          </AppText>
          <AppText
            variant="caption"
            tone="brand"
            weight="700"
            onPress={retry}
            accessibilityRole="button"
            accessibilityLabel="Reintentar la consulta del activo"
          >
            Reintentar
          </AppText>
        </View>
      ) : state === 'unavailable' || !label ? (
        <AppText variant="caption" weight="700" tone="secondary" style={styles.value}>
          {PLANNER_ASSET_SOURCE_UNAVAILABLE}
        </AppText>
      ) : (
        <InteractivePressable
          accessibilityRole="button"
          accessibilityLabel={`Abrir el activo ${label.name}`}
          onPress={open}
          disabled={!canOpen}
          haptic="light"
          pressScale={0.98}
          style={styles.valueButton}
        >
          <AppText variant="caption" weight="700" numberOfLines={1}>
            {label.name} ›
          </AppText>
        </InteractivePressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  label: {
    width: 96,
  },
  value: {
    flex: 1,
  },
  valueButton: {
    flex: 1,
  },
});
