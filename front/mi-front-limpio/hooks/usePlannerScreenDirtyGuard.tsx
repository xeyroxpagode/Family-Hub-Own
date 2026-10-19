/**
 * Planner V1 — Phase 1 screen-level dirty guard.
 *
 * Standalone form ROUTES (CreateTask / EditTask / CreateEvent / …, reachable
 * from Home deep-links) must respect the same Dirty Guard contract as sheets:
 * a dirty form never closes silently. X / Android back route through
 * `requestClose`; a dirty draft raises the same "¿Descartar los cambios?"
 * question with the same safe-focus semantics (PlannerSheetGuardView).
 *
 * The guard is a plain Modal: its own `onRequestClose` handles Android back
 * while asking and always LEAVES the question (never discards), matching the
 * sheet contract.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Modal, Platform, StyleSheet, View } from 'react-native';

import { PlannerSheetGuardView } from '../components/planner/PlannerSheetGuardView';
import { useAppTheme } from '../context/AppThemeContext';

export type PlannerScreenDirtyGuardOptions = {
  /** Guard is only needed for route-embedded forms (sheets have their own). */
  readonly enabled: boolean;
  /** Derived dirty state: normalized draft differs from the opening snapshot. */
  readonly isDirty: () => boolean;
  /** The real close (navigation), executed only on a clean or discarded exit. */
  readonly onDiscard: () => void;
};

export type PlannerScreenDirtyGuard = {
  /** Returns true when the form actually closed, false when the question appeared. */
  readonly requestClose: () => boolean;
  /** Render at the form root; null unless asking. */
  readonly guardElement: React.ReactNode;
};

export function usePlannerScreenDirtyGuard(
  options: PlannerScreenDirtyGuardOptions,
): PlannerScreenDirtyGuard {
  const { enabled } = options;
  const [asking, setAsking] = useState(false);
  const isDirtyRef = useRef(options.isDirty);
  isDirtyRef.current = options.isDirty;
  const onDiscardRef = useRef(options.onDiscard);
  onDiscardRef.current = options.onDiscard;

  const requestClose = useCallback((): boolean => {
    if (!enabled) {
      onDiscardRef.current();
      return true;
    }
    if (isDirtyRef.current()) {
      setAsking(true);
      return false;
    }
    onDiscardRef.current();
    return true;
  }, [enabled]);

  const keepEditing = useCallback(() => setAsking(false), []);

  const discard = useCallback(() => {
    setAsking(false);
    onDiscardRef.current();
  }, []);

  // Android back on the form screen: ask before losing a dirty draft. While
  // asking, the visible Modal consumes back itself (leaveAsk semantics).
  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (asking) return false;
      requestClose();
      return true;
    });
    return () => subscription.remove();
  }, [enabled, asking, requestClose]);

  const { colors, radius } = useAppTheme();

  const guardElement = asking ? (
    <Modal visible transparent animationType="fade" onRequestClose={keepEditing}>
      <View style={styles.overlay}>
        <View style={[styles.panel, { backgroundColor: colors.background.base, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl }]}>
          <View style={[styles.handle, { backgroundColor: colors.border.strong }]} />
          <PlannerSheetGuardView onKeepEditing={keepEditing} onDiscard={discard} />
        </View>
      </View>
    </Modal>
  ) : null;

  return { requestClose, guardElement };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  panel: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
});
