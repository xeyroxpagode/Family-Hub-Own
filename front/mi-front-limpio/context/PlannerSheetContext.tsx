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

import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { Platform } from 'react-native';

import {
  sheetMachineReducer,
  type OpenEventInput,
  type OpenGoalInput,
  type OpenTaskInput,
  type PlannerSheetCloseReason,
  type PlannerSheetEvent,
  type PlannerSheetState,
} from '../services/planner/plannerSheetState';
import { isNodeAccessible } from '../services/planner/plannerSheetFocus';

// ---------------------------------------------------------------------------
// 1. Public controller API
// ---------------------------------------------------------------------------

export type PlannerSheetController = {
  readonly state: PlannerSheetState;
  readonly isOpen: boolean;
  readonly isSubmitting: boolean;

  openActions(): void;
  openTaskForm(input: OpenTaskInput): void;
  openEventForm(input: OpenEventInput): void;
  openGoalForm(input: OpenGoalInput): void;

  replace(next: PlannerSheetState): void;
  requestClose(reason: PlannerSheetCloseReason): void;
  forceClose(reason: PlannerSheetCloseReason): void;

  beginSubmit(intentId: string): void;
  endSubmit(intentId: string): void;

  readonly triggerRef: React.RefObject<unknown | null>;
};

const INITIAL_STATE: PlannerSheetState = Object.freeze({ kind: 'closed' });

const noopController: PlannerSheetController = {
  state: INITIAL_STATE,
  isOpen: false,
  isSubmitting: false,
  openActions: () => {},
  openTaskForm: () => {},
  openEventForm: () => {},
  openGoalForm: () => {},
  replace: () => {},
  requestClose: () => {},
  forceClose: () => {},
  beginSubmit: () => {},
  endSubmit: () => {},
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
      openActions,
      openTaskForm,
      openEventForm,
      openGoalForm,
      replace,
      requestClose,
      forceClose,
      beginSubmit,
      endSubmit,
      triggerRef,
    }),
    [
      machine.state,
      machine.isSubmitting,
      openActions,
      openTaskForm,
      openEventForm,
      openGoalForm,
      replace,
      requestClose,
      forceClose,
      beginSubmit,
      endSubmit,
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