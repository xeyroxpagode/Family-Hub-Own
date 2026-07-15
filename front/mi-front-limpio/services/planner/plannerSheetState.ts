/**
 * Planner V1 — M3 Canonical Sheet State Machine.
 *
 * Purpose (frozen by `planner_v1_implementation_order.md` §M3):
 * - Single authority for sheet state across Planner.
 * - Pure reducer, testable without React.
 * - Guarantees a single active state, deterministic transitions, no accidental
 *   stacking, no close while submitting, forced cleanup by lifecycle events.
 *
 * Out of scope:
 * - Rendering (belongs to `PlannerSheetHost`).
 * - Form logic (each form owns its fields and validations).
 * - Quick Actions design (belongs to M4).
 * - Goal Quick Create (belongs to M5).
 */

import type { PlannerNavigationSource } from '../../navigation/plannerNavigationContract';

// ---------------------------------------------------------------------------
// 1. Sheet kind — closed discriminated union
// ---------------------------------------------------------------------------

export type PlannerSheetKind = 'closed' | 'actions' | 'task_form' | 'event_form' | 'goal_form';

// ---------------------------------------------------------------------------
// 2. PlannerSheetState — a single discrimated union (no representing
//    impossible states)
// ---------------------------------------------------------------------------

export type PlannerSheetState =
  | { readonly kind: 'closed' }
  | { readonly kind: 'actions' }
  | {
      readonly kind: 'task_form';
      readonly mode: 'create' | 'edit';
      readonly taskId?: string;
      readonly source: PlannerNavigationSource;
      readonly initialDueDate?: string;
    }
  | {
      readonly kind: 'event_form';
      readonly mode: 'create' | 'edit';
      readonly eventId?: string;
      readonly source: PlannerNavigationSource;
      readonly initialDate?: string;
    }
  | {
      readonly kind: 'goal_form';
      readonly mode: 'create' | 'edit';
      readonly goalId?: string;
      readonly source: PlannerNavigationSource;
    };

// ---------------------------------------------------------------------------
// 3. Open inputs — minimal shape, no entity objects, no tokens
// ---------------------------------------------------------------------------

export type OpenTaskInput = {
  readonly mode?: 'create' | 'edit';
  readonly taskId?: string;
  readonly source: PlannerNavigationSource;
  readonly initialDueDate?: string;
};

export type OpenEventInput = {
  readonly mode?: 'create' | 'edit';
  readonly eventId?: string;
  readonly source: PlannerNavigationSource;
  readonly initialDate?: string;
};

export type OpenGoalInput = {
  readonly mode?: 'create' | 'edit';
  readonly goalId?: string;
  readonly source: PlannerNavigationSource;
};

// ---------------------------------------------------------------------------
// 4. Close reason — closed enum
// ---------------------------------------------------------------------------

export type PlannerSheetCloseReason =
  | 'user_request'
  | 'success'
  | 'backdrop'
  | 'back_button'
  | 'force_close'
  | 'household_changed'
  | 'session_ended';

// ---------------------------------------------------------------------------
// 5. Sheet events — pure events that drive the reducer
// ---------------------------------------------------------------------------

export type PlannerSheetEvent =
  | { readonly type: 'OPEN_ACTIONS' }
  | { readonly type: 'OPEN_TASK'; readonly input: OpenTaskInput }
  | { readonly type: 'OPEN_EVENT'; readonly input: OpenEventInput }
  | { readonly type: 'OPEN_GOAL'; readonly input: OpenGoalInput }
  | { readonly type: 'REPLACE'; readonly next: PlannerSheetState }
  | { readonly type: 'REQUEST_CLOSE'; readonly reason: PlannerSheetCloseReason }
  | { readonly type: 'FORCE_CLOSE'; readonly reason: PlannerSheetCloseReason }
  | { readonly type: 'SUBMIT_BEGIN'; readonly intentId: string }
  | { readonly type: 'SUBMIT_END'; readonly intentId: string }
  | { readonly type: 'HOUSEHOLD_CHANGED' }
  | { readonly type: 'SESSION_ENDED' };

// ---------------------------------------------------------------------------
// 8. Pure reducer
// ---------------------------------------------------------------------------

type SheetContext = { readonly isSubmitting: boolean; readonly activeIntentId: string | null };
export type { SheetContext };
type SheetResult = { state: PlannerSheetState; isSubmitting: boolean; activeIntentId: string | null };

function noChange(state: PlannerSheetState, context: SheetContext): SheetResult {
  return { state, isSubmitting: context.isSubmitting, activeIntentId: context.activeIntentId };
}

function closed(context: SheetContext): SheetResult {
  return { state: { kind: 'closed' }, isSubmitting: false, activeIntentId: null };
}

function silentReplace(
  current: PlannerSheetState,
  next: PlannerSheetState,
  context: SheetContext,
): SheetResult {
  if (context.isSubmitting && next.kind !== 'closed') return noChange(current, context);
  return { state: next, isSubmitting: context.isSubmitting, activeIntentId: context.activeIntentId };
}

export function sheetMachineReducer(
  state: PlannerSheetState,
  context: SheetContext,
  event: PlannerSheetEvent,
): SheetResult {
  switch (event.type) {
    // --- OPEN operations (idempotent; double tap does not stack) ---
    // OPEN is allowed even while submitting — it replaces the current state
    // without creating a second sheet. Only CLOSE/REPLACE are blocked.

    case 'OPEN_ACTIONS':
      if (state.kind === 'actions') return noChange(state, context);
      return {
        state: { kind: 'actions' },
        isSubmitting: context.isSubmitting,
        activeIntentId: context.activeIntentId,
      };

    case 'OPEN_TASK': {
      const desired: PlannerSheetState = {
        kind: 'task_form',
        mode: event.input.mode ?? 'create',
        taskId: event.input.taskId,
        source: event.input.source,
        initialDueDate: event.input.initialDueDate,
      };
      if (state.kind === 'task_form' && sameTask(state, desired)) return noChange(state, context);
      return {
        state: desired,
        isSubmitting: context.isSubmitting,
        activeIntentId: context.activeIntentId,
      };
    }

    case 'OPEN_EVENT': {
      const desired: PlannerSheetState = {
        kind: 'event_form',
        mode: event.input.mode ?? 'create',
        eventId: event.input.eventId,
        source: event.input.source,
        initialDate: event.input.initialDate,
      };
      if (state.kind === 'event_form' && sameEvent(state, desired)) return noChange(state, context);
      return {
        state: desired,
        isSubmitting: context.isSubmitting,
        activeIntentId: context.activeIntentId,
      };
    }

    case 'OPEN_GOAL': {
      const desired: PlannerSheetState = {
        kind: 'goal_form',
        mode: event.input.mode ?? 'create',
        goalId: event.input.goalId,
        source: event.input.source,
      };
      if (state.kind === 'goal_form' && sameGoal(state, desired)) return noChange(state, context);
      return {
        state: desired,
        isSubmitting: context.isSubmitting,
        activeIntentId: context.activeIntentId,
      };
    }

    // --- REPLACE: direct state swap (silent, no animation) ---
    // Blocked while submitting (except forced close to 'closed').

    case 'REPLACE':
      if (context.isSubmitting) return noChange(state, context);
      return silentReplace(state, event.next, context);

    // --- REQUEST_CLOSE: user-requested, blocked if submitting ---

    case 'REQUEST_CLOSE':
      if (context.isSubmitting) return noChange(state, context);
      return {
        state: { kind: 'closed' },
        isSubmitting: context.isSubmitting,
        activeIntentId: context.activeIntentId,
      };

    // --- FORCE_CLOSE: lifecycle-authorized, always works ---

    case 'FORCE_CLOSE':
      return closed(context);

    // --- HOUSEHOLD_CHANGED / SESSION_ENDED: lifecycle cleanup ---

    case 'HOUSEHOLD_CHANGED':
    case 'SESSION_ENDED':
      return closed(context);

    // --- SUBMIT lock ---

    case 'SUBMIT_BEGIN':
      if (context.isSubmitting) return noChange(state, context);
      return {
        state,
        isSubmitting: true,
        activeIntentId: event.intentId,
      };

    case 'SUBMIT_END':
      // Stale intent: the intent id doesn't match the active one → ignore.
      if (context.activeIntentId !== event.intentId) return noChange(state, context);
      return {
        state,
        isSubmitting: false,
        activeIntentId: null,
      };

    default:
      return noChange(state, context);
  }
}

// ---------------------------------------------------------------------------
// 9. Helpers
// ---------------------------------------------------------------------------

function sameTask(a: PlannerSheetState & { kind: 'task_form' }, b: PlannerSheetState & { kind: 'task_form' }): boolean {
  return a.mode === b.mode && a.taskId === b.taskId;
}

function sameEvent(a: PlannerSheetState & { kind: 'event_form' }, b: PlannerSheetState & { kind: 'event_form' }): boolean {
  return a.mode === b.mode && a.eventId === b.eventId;
}

function sameGoal(a: PlannerSheetState & { kind: 'goal_form' }, b: PlannerSheetState & { kind: 'goal_form' }): boolean {
  return a.mode === b.mode && a.goalId === b.goalId;
}

// ---------------------------------------------------------------------------
// 10. Guards (no React, no side effects)
// ---------------------------------------------------------------------------

export function isSheetClosed(state: PlannerSheetState): state is { kind: 'closed' } {
  return state.kind === 'closed';
}