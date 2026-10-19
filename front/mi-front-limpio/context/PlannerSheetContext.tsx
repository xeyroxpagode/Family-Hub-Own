/**
 * Planner V1 — M3 PlannerSheetProvider.
 *
 * Purpose (frozen by `planner_v1_implementation_order.md` §M3):
 * - Single provider that owns Planner sheet state.
 * - Exposes a closed public API (open, close, replace, submit lock).
 * - Integrates with Core lifecycle for household switch / sign-out cleanup.
 * - Focus ref exposed for restorable trigger handling.
 *
 * Out of scope:
 * - Rendering (belongs to `PlannerSheetHost`).
 * - Form logic (each form owns its fields and validations).
 * - Navigation (belongs to M1 helpers).
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Platform } from 'react-native';

// PlannerSheetContext is defined in this file
import {
  sheetMachineReducer,
  type OpenConfirmInput,
  type OpenConfirmDestructiveInput,
  type OpenEventInput,
  type OpenGoalInput,
  type OpenPlanInput,
  type OpenTaskInput,
  type PlannerSheetCloseReason,
  type PlannerSheetEvent,
  type PlannerSheetState,
} from '../services/planner/plannerSheetState';
import { isNodeAccessible } from '../services/planner/plannerSheetFocus';
import { resolveCloseAttempt, type PlannerSheetCloseDecision } from '../services/planner/plannerSheetGuard';

/**
 * A form registers one dirty probe while it is mounted inside the sheet. The
 * probe must DERIVE dirtiness (normalized draft vs opening snapshot), never
 * track interaction events. Returning `true` means "closing now would lose
 * user work" and routes the close attempt into the discard question.
 */
export type PlannerDirtyProbe = () => boolean;

export type PlannerToast = {
  readonly id: string;
  readonly message: string;
  readonly undoLabel?: string;
  readonly onUndo?: () => void;
  readonly durationMs?: number;
  readonly kind?: 'success' | 'warning' | 'error' | 'info';
};

type ToastListener = (toast: PlannerToast) => void;

// ---------------------------------------------------------------------------
// 1. Public controller API
// ---------------------------------------------------------------------------

export type PlannerSheetController = {
  readonly state: PlannerSheetState;
  readonly isOpen: boolean;
  readonly isSubmitting: boolean;
  /**
   * The sheet is currently asking "¿Descartar los cambios?" instead of showing
   * the form body. While asking, non-destructive exits return to the form.
   */
  readonly askingDismiss: boolean;

  openActions(): void;
  openTaskForm(input: OpenTaskInput): void;
  openEventForm(input: OpenEventInput): void;
  openGoalForm(input: OpenGoalInput): void;
  openPlanForm(input: OpenPlanInput): void;
  openConfirm(input: OpenConfirmInput): void;
  openConfirmDestructive(input: OpenConfirmDestructiveInput): void;

  replace(next: PlannerSheetState): void;
  requestClose(reason: PlannerSheetCloseReason): void;
  forceClose(reason: PlannerSheetCloseReason): void;
  /**
   * Guarded close: routes through the dirty probe. Clean sheets close; dirty
   * sheets enter the discard question; from the question it returns to the
   * form. Blocked without effect while submitting. Returns the resolved
   * decision so interactive callers (drag release) can animate accordingly.
   */
  attemptClose(reason: PlannerSheetCloseReason): PlannerSheetCloseDecision;
  /** Destructive exit from the discard question. Closes and discards the draft. */
  discardFromGuard(reason: PlannerSheetCloseReason): void;
  /**
   * Register the active form's dirty probe. Pass `null` to clear. Returns an
   * unregister function. Only the most recent registration is active (there
   * is a single sheet).
   */
  registerDirtyProbe(probe: PlannerDirtyProbe | null): () => void;

  beginSubmit(intentId: string): void;
  endSubmit(intentId: string): void;

  /** Push a toast notification. Replaces any existing toast (single toast contract). */
  pushToast(toast: PlannerToast): void;
  /** Subscribe to toast notifications. Returns unsubscribe function. */
  subscribeToToast(listener: ToastListener): () => void;

  readonly triggerRef: React.RefObject<unknown | null>;
};

const INITIAL_STATE: PlannerSheetState = Object.freeze({ kind: 'closed' });

const noopController: PlannerSheetController = {
  state: INITIAL_STATE,
  isOpen: false,
  isSubmitting: false,
  askingDismiss: false,
  openActions: () => {},
  openTaskForm: () => {},
  openEventForm: () => {},
  openGoalForm: () => {},
  openPlanForm: () => {},
  openConfirm: () => {},
  openConfirmDestructive: () => {},
  replace: () => {},
  requestClose: () => {},
  forceClose: () => {},
  attemptClose: () => 'close' as PlannerSheetCloseDecision,
  discardFromGuard: () => {},
  registerDirtyProbe: () => () => {},
  beginSubmit: () => {},
  endSubmit: () => {},
  pushToast: () => {},
  subscribeToToast: () => () => {},
  triggerRef: { current: null },
};

// ---------------------------------------------------------------------------
// 2. Context
// ---------------------------------------------------------------------------

const PlannerSheetCtx = createContext<PlannerSheetController>(noopController);
PlannerSheetCtx.displayName = 'PlannerSheetContext';

// ---------------------------------------------------------------------------
// 3. Provider
// ---------------------------------------------------------------------------

type PlannerSheetProviderProps = {
  children: React.ReactNode;
};

export function PlannerSheetProvider({ children }: PlannerSheetProviderProps) {
  type MachineState = { state: PlannerSheetState; isSubmitting: boolean; activeIntentId: string | null };

  const [machine, dispatch] = useReducer(
    (prev: MachineState, event: PlannerSheetEvent): MachineState => {
      const result = sheetMachineReducer(prev.state, prev, event);
      return { state: result.state, isSubmitting: result.isSubmitting, activeIntentId: result.activeIntentId };
    },
    { state: INITIAL_STATE, isSubmitting: false, activeIntentId: null },
  );

  const triggerRef = useRef<unknown>(null);

  // --- Dirty guard state (Phase 1 shared interaction foundation) ---

  const [askingDismiss, setAskingDismiss] = useState(false);
  const dirtyProbeRef = useRef<PlannerDirtyProbe | null>(null);
  const askingRef = useRef(false);

  // Keep a ref mirror so stable callbacks read fresh values without
  // re-creating on every render.
  const syncAsking = useCallback((next: boolean) => {
    askingRef.current = next;
    setAskingDismiss(next);
  }, []);

  // Any sheet kind change (open, replace, close, lifecycle cleanup) leaves the
  // question: the guard exists only within one sheet presentation.
  useEffect(() => {
    syncAsking(false);
  }, [machine.state.kind, syncAsking]);

  const registerDirtyProbe = useCallback((probe: PlannerDirtyProbe | null) => {
    dirtyProbeRef.current = probe;
    return () => {
      if (dirtyProbeRef.current === probe) {
        dirtyProbeRef.current = null;
      }
    };
  }, []);

  const isDirty = useCallback((): boolean => {
    try {
      return dirtyProbeRef.current?.() ?? false;
    } catch {
      // A broken probe must not wedge the sheet open forever: degrade to the
      // pre-guard behavior (close) rather than a stuck overlay.
      return false;
    }
  }, []);

  const attemptClose = useCallback(
    (reason: PlannerSheetCloseReason): PlannerSheetCloseDecision => {
      const decision: PlannerSheetCloseDecision = resolveCloseAttempt({
        asking: askingRef.current,
        dirty: isDirty(),
        isSubmitting: machine.isSubmitting,
      });
      if (decision === 'leave_ask') {
        syncAsking(false);
        return decision;
      }
      if (decision === 'ask') {
        syncAsking(true);
        return decision;
      }
      if (decision === 'close') {
        syncAsking(false);
        dispatch({ type: 'REQUEST_CLOSE', reason });
      }
      // 'blocked': submitting — no effect, mirrors the reducer contract.
      return decision;
    },
    [dispatch, isDirty, machine.isSubmitting, syncAsking],
  );

  const discardFromGuard = useCallback(
    (reason: PlannerSheetCloseReason) => {
      syncAsking(false);
      if (!machine.isSubmitting) {
        dispatch({ type: 'REQUEST_CLOSE', reason });
      }
    },
    [dispatch, machine.isSubmitting, syncAsking],
  );

  // --- Public API ---

  const openActions = useCallback(() => dispatch({ type: 'OPEN_ACTIONS' }), []);

  const openTaskForm = useCallback(
    (input: OpenTaskInput) => dispatch({ type: 'OPEN_TASK', input }),
    [],
  );

  const openEventForm = useCallback(
    (input: OpenEventInput) => dispatch({ type: 'OPEN_EVENT', input }),
    [],
  );

  const openGoalForm = useCallback(
    (input: OpenGoalInput) => dispatch({ type: 'OPEN_GOAL', input }),
    [],
  );

  const openPlanForm = useCallback(
    (input: OpenPlanInput) => dispatch({ type: 'OPEN_PLAN', input }),
    [],
  );

  const openConfirm = useCallback(
    (input: OpenConfirmInput) => dispatch({ type: 'OPEN_CONFIRM', input }),
    [],
  );

  const openConfirmDestructive = useCallback(
    (input: OpenConfirmDestructiveInput) => dispatch({ type: 'OPEN_CONFIRM_DESTRUCTIVE', input }),
    [],
  );

  const replace = useCallback(
    (next: PlannerSheetState) => dispatch({ type: 'REPLACE', next }),
    [],
  );

  const requestClose = useCallback(
    (reason: PlannerSheetCloseReason) => dispatch({ type: 'REQUEST_CLOSE', reason }),
    [],
  );

  const forceClose = useCallback(
    (reason: PlannerSheetCloseReason) => dispatch({ type: 'FORCE_CLOSE', reason }),
    [],
  );

  const beginSubmit = useCallback(
    (intentId: string) => dispatch({ type: 'SUBMIT_BEGIN', intentId }),
    [],
  );

  const endSubmit = useCallback(
    (intentId: string) => dispatch({ type: 'SUBMIT_END', intentId }),
    [],
  );

  // --- Toast system (Phase 1 shared interaction foundation) ---
  const toastListenersRef = useRef<Set<ToastListener>>(new Set());

  const pushToast = useCallback((toast: PlannerToast) => {
    // Single toast contract: notify all listeners with the new toast
    toastListenersRef.current.forEach((listener) => listener(toast));
  }, []);

  const subscribeToToast = useCallback((listener: ToastListener) => {
    toastListenersRef.current.add(listener);
    return () => {
      toastListenersRef.current.delete(listener);
    };
  }, []);

  // --- Lifecycle ---

  // Subscribe to household change and sign-out via the Core lifecycle registry,
  // which runs before/after switch and during session cleanup.
  const lifecycleRef = useRef<{
    householdUnreg: (() => void) | null;
    sessionUnreg: (() => void) | null;
  }>({ householdUnreg: null, sessionUnreg: null });

  useEffect(() => {
    let disposed = false;

    // Dynamic import to avoid circular dependency — lifecycle is a pure service.
    const register = async () => {
      try {
        const { registerHouseholdLifecycle, registerSessionLifecycle } =
          await import('../services/core/lifecycle.js');

        if (disposed) return;

        lifecycleRef.current.householdUnreg = registerHouseholdLifecycle({
          name: 'planner.sheet-host',
          order: 110, // after planner.server-state (100), before UI remounts
          beforeSwitch: () => {
            dispatch({ type: 'HOUSEHOLD_CHANGED' });
          },
        });

        lifecycleRef.current.sessionUnreg = registerSessionLifecycle({
          name: 'planner.sheet-host',
          order: 110,
          cleanup: () => {
            dispatch({ type: 'SESSION_ENDED' });
          },
        });
      } catch {
        // Lifecycle registration unavailable — safe degradation for test envs.
      }
    };

    void register();

    return () => {
      disposed = true;
      lifecycleRef.current.householdUnreg?.();
      lifecycleRef.current.sessionUnreg?.();
    };
  }, []);

  // --- Android Back delegate ---
  // We store whether the host consumed back so navigation can skip when sheet
  // is open. This is consumed by PlannerScreen via the context.
  const androidBackFlag = machine.isSubmitting
    ? false // back blocked during submit
    : machine.state.kind !== 'closed';

  const controller: PlannerSheetController = useMemo(
    () => ({
      state: machine.state,
      isOpen: machine.state.kind !== 'closed',
      isSubmitting: machine.isSubmitting,
      askingDismiss,
      openActions,
      openTaskForm,
      openEventForm,
      openGoalForm,
      openPlanForm,
      openConfirm,
      openConfirmDestructive,
      replace,
      requestClose,
      forceClose,
      attemptClose,
      discardFromGuard,
      registerDirtyProbe,
      beginSubmit,
      endSubmit,
      pushToast,
      subscribeToToast,
      triggerRef,
    }),
    [
      machine.state,
      machine.isSubmitting,
      askingDismiss,
      openActions,
      openTaskForm,
      openEventForm,
      openGoalForm,
      openPlanForm,
      openConfirm,
      openConfirmDestructive,
      replace,
      requestClose,
      forceClose,
      attemptClose,
      discardFromGuard,
      registerDirtyProbe,
      beginSubmit,
      endSubmit,
      pushToast,
      subscribeToToast,
    ],
  );

  return (
    <PlannerSheetCtx.Provider value={controller}>
      {children}
    </PlannerSheetCtx.Provider>
  );
}

// ---------------------------------------------------------------------------
// 4. Consumer hook
// ---------------------------------------------------------------------------

export function usePlannerSheet(): PlannerSheetController {
  return useContext(PlannerSheetCtx);
}
