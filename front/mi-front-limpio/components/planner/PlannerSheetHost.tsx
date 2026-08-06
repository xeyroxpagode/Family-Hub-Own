/**
 * Planner V1 — M4 PlannerSheetHost (Quick Actions final design + submit lifecycle).
 *
 * Purpose (frozen by `planner_v1_implementation_order.md` M3/M4):
 * - Single `Modal` component for all Planner sheets (actions menu, task form,
 *   event form, goal form slot).
 * - M4 adds final Quick Actions design, capabilities-driven visibility,
 *   mutation intent, directed invalidation, and submit lifecycle integration.
 * - Backdrop closes when permitted (not during submit).
 * - Android Back handler: close when open and not submitting, else delegate.
 * - Accessibility heading announced on open; focus managed on entry/exit.
 * - Cleanup on unmount.
 *
 * Ownership rules:
 * - ONLY this component mounts a Planner `Modal`.
 * - `PlannerScreen` and `QuickActionSheet` no longer own modals post-M3.
 *
 * Out of scope:
 * - Goal Quick Create product flow (belongs to M5).
 * - Search (belongs to M7).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { plannerStyles as S } from '../../screens/planner/plannerShared';
import { AppText } from '../ui/AppText';
import { usePlannerSheet } from '../../context/PlannerSheetContext';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { EventForm } from '../../screens/planner/EventForm';
import { TaskForm } from '../../screens/planner/TaskForm';
import { GoalForm } from '../../screens/planner/GoalForm';
import { PlannerPlanMinimalCreateSurface } from '../../screens/planner/PlannerPlansSurfaces';
import { QuickActionsMenu } from './QuickActionsMenu';
import type { PlannerSheetState } from '../../services/planner/plannerSheetState';
import {
  announceSheetOpened,
  isNodeAccessible,
  attemptFocusReturn,
} from '../../services/planner/plannerSheetFocus';
import {
  fetchPlannerCapabilitiesCached,
  type PlannerCapabilitiesProjection,
} from '../../services/plannerCapabilities';
import {
  createTaskIntent,
  createEventIntent,
  createGoalIntent,
  type PlannerMutationIntent,
} from '../../services/planner/plannerSubmitAdapter';
import { plannerCache } from '../../services/planner/plannerCache';
import { plannerQuickActionsTelemetry } from '../../services/planner/plannerQuickActionsTelemetry';
import { openGoalDetail } from '../../navigation/plannerNavigationHelpers';
import type { PlanGraphWriteRequest } from '../../services/planner/plannerPlans';
import { createPlannerMutationIntent } from '../../services/planner/plannerMutationIntent';
import { tracePlanWrite } from '../../services/planner/planWriteTrace';
import { createPlanWriteSingleFlightGate } from '../../services/planner/planWriteSingleFlight';
import { enqueuePlannerPlanGraphWrite } from '../../services/planner/reliability';
import { usePlanCompositionTrace } from '../../services/planner/planCompositionTrace';

// ---------------------------------------------------------------------------
// 1. Heading map (a11y announcement text)
// ---------------------------------------------------------------------------

const SHEET_HEADINGS: Record<string, string> = {
  actions: 'Crear: acciones rápidas',
  task_form: 'Formulario: nueva tarea',
  event_form: 'Formulario: nuevo evento',
  goal_form: 'Formulario: nuevo plan',
  plan_form: 'Formulario: nuevo plan',
};

// ---------------------------------------------------------------------------
// 2. Quick Actions menu host (M4 final design)
// ---------------------------------------------------------------------------

function ActionsMenuHost() {
  const { session } = useAuth();
  const { currentHousehold } = useHousehold();
  const accessToken = session?.access_token;

  const [capabilities, setCapabilities] = useState<PlannerCapabilitiesProjection | null>(null);
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(true);

  const openedTelemetryEmitted = useRef(false);

  useEffect(() => {
    let disposed = false;
    const token = accessToken;
    const household = currentHousehold;
    if (!token || !household || !household.created_by) {
      setCapabilitiesLoading(false);
      return;
    }

    setCapabilitiesLoading(true);
    fetchPlannerCapabilitiesCached(token, {
      accountId: household.created_by,
      householdId: household.id,
      membershipId: household.created_by,
    })
      .then((projection) => {
        if (!disposed) {
          setCapabilities(projection);
          setCapabilitiesLoading(false);
          if (!openedTelemetryEmitted.current) {
            openedTelemetryEmitted.current = true;
            plannerQuickActionsTelemetry.opened(accessToken);
          }
        }
      })
      .catch(() => {
        if (!disposed) {
          setCapabilities(null);
          setCapabilitiesLoading(false);
        }
      });

    return () => { disposed = true; };
  }, [accessToken, currentHousehold]);

  const handleActionSelected = useCallback((actionType: 'task' | 'event' | 'goal') => {
    plannerQuickActionsTelemetry.selected(actionType, accessToken);
  }, [accessToken]);

  return (
    <QuickActionsMenu
      capabilities={capabilities}
      capabilitiesLoading={capabilitiesLoading}
      onActionSelected={handleActionSelected}
    />
  );
}

// ---------------------------------------------------------------------------
// 3. Form adapters (mutation intent + sheet lock + directed invalidation)
// ---------------------------------------------------------------------------

function TaskFormHost() {
  const sheet = usePlannerSheet();
  const { currentHousehold } = useHousehold();
  const { session } = useAuth();
  const accessToken = session?.access_token;

  const mold = sheet.state as PlannerSheetState & { kind: 'task_form' };

  // Stable mutation intent for create, created once when the form opens.
  const intentRef = useRef<PlannerMutationIntent | null>(null);
  if (!intentRef.current && mold.mode === 'create') {
    intentRef.current = createTaskIntent();
  }
  const intent = intentRef.current;

  const createMutationId = intent?.mutationId;

  const onSubmitBegin = useCallback(
    (intentId: string) => {
      sheet.beginSubmit(intentId);
    },
    [sheet],
  );

  const onSubmitEnd = useCallback(
    (intentId: string) => {
      sheet.endSubmit(intentId);
    },
    [sheet],
  );

  const onClose = useCallback(() => {
    sheet.requestClose('user_request');
  }, [sheet]);

  const onSaved = useCallback(
    (_message: string) => {
      // Directed invalidation for task create
      if (currentHousehold) {
        plannerCache.executeInvalidation(
          { kind: 'task', action: 'create' },
          { householdId: currentHousehold.id },
        );
      }
      plannerQuickActionsTelemetry.submitSucceeded('task', accessToken);
      // Release the submit lock with the SAME intent id that was passed to
      // beginSubmit. Otherwise the reducer treats SUBMIT_END as a stale
      // event (activeIntentId !== event.intentId), isSubmitting stays true,
      // REQUEST_CLOSE is blocked by the reducer, and the sheet never closes.
      // This is exactly the path that produced "POST 201 + submit_succeeded
      // but the sheet stays open, Cerrar disabled and the same mutation_id
      // re-sent on a second tap".
      if (createMutationId) {
        sheet.endSubmit(createMutationId);
      }
      sheet.requestClose('success');
    },
    [sheet, currentHousehold, accessToken, createMutationId],
  );

  const onError = useCallback(
    (errorCode: string) => {
      plannerQuickActionsTelemetry.submitFailed('task', errorCode, accessToken);
    },
    [accessToken],
  );

  return (
    <TaskForm
      mode={mold.mode}
      embedded
      taskId={mold.taskId}
      initialDueDate={mold.initialDueDate}
      onClose={onClose}
      onSaved={onSaved}
      createMutationId={createMutationId}
      onSubmitBegin={onSubmitBegin}
      onSubmitEnd={onSubmitEnd}
    />
  );
}

function EventFormHost() {
  const sheet = usePlannerSheet();
  const { currentHousehold } = useHousehold();
  const { session } = useAuth();
  const accessToken = session?.access_token;

  const mold = sheet.state as PlannerSheetState & { kind: 'event_form' };

  const intentRef = useRef<PlannerMutationIntent | null>(null);
  if (!intentRef.current && mold.mode === 'create') {
    intentRef.current = createEventIntent();
  }
  const intent = intentRef.current;

  const createMutationId = intent?.mutationId;

  const onSubmitBegin = useCallback(
    (intentId: string) => {
      sheet.beginSubmit(intentId);
    },
    [sheet],
  );

  const onSubmitEnd = useCallback(
    (intentId: string) => {
      sheet.endSubmit(intentId);
    },
    [sheet],
  );

  const onClose = useCallback(() => {
    sheet.requestClose('user_request');
  }, [sheet]);

  const onSaved = useCallback(
    (_message: string) => {
      if (currentHousehold) {
        plannerCache.executeInvalidation(
          { kind: 'event', action: 'create' },
          { householdId: currentHousehold.id },
        );
      }
      plannerQuickActionsTelemetry.submitSucceeded('event', accessToken);
      // See TaskFormHost.onSaved: the submit lock MUST be released with the
      // same intent id that beginSubmit received, otherwise the reducer
      // treats SUBMIT_END as stale and the sheet never closes (the 22023 /
      // 201 -> sheet stays open chain observed on Android).
      if (createMutationId) {
        sheet.endSubmit(createMutationId);
      }
      sheet.requestClose('success');
    },
    [sheet, currentHousehold, accessToken, createMutationId],
  );

  return (
    <EventForm
      mode={mold.mode}
      embedded
      eventId={mold.eventId}
      initialDate={mold.initialDate}
      onClose={onClose}
      onSaved={onSaved}
      createMutationId={createMutationId}
      onSubmitBegin={onSubmitBegin}
      onSubmitEnd={onSubmitEnd}
    />
  );
}

/**
 * GoalFormHost: full productive flow for M5 Goal Quick Create.
 *
 * Mirrors TaskFormHost/EventFormHost: stable mutation intent, submit lock,
 * directed invalidation, post-create navigation via openGoalDetail with
 * justCreated=true, and telemetry.
 */
function GoalFormHost() {
  const sheet = usePlannerSheet();
  const { currentHousehold } = useHousehold();
  const { session } = useAuth();
  const accessToken = session?.access_token;
  // REC-0A — record mount/unmount of the Goal form host (legacy Goal Quick
  // Create flow that still coexists with the Plan form host).
  void usePlanCompositionTrace('GoalFormHost');

  const mold = sheet.state as PlannerSheetState & { kind: 'goal_form' };

  const intentRef = useRef<PlannerMutationIntent | null>(null);
  if (!intentRef.current && mold.mode === 'create') {
    intentRef.current = createGoalIntent();
  }
  const intent = intentRef.current;

  const createMutationId = intent?.mutationId;

  const onSubmitBegin = useCallback(
    (intentId: string) => {
      sheet.beginSubmit(intentId);
    },
    [sheet],
  );

  const onSubmitEnd = useCallback(
    (intentId: string) => {
      sheet.endSubmit(intentId);
    },
    [sheet],
  );

  const onClose = useCallback(() => {
    sheet.requestClose('user_request');
  }, [sheet]);

  const onSaved = useCallback(
    (_message: string) => {
      // Directed invalidation for goal create
      if (currentHousehold) {
        plannerCache.executeInvalidation(
          { kind: 'goal', action: 'create' },
          { householdId: currentHousehold.id },
        );
      }
      plannerQuickActionsTelemetry.submitSucceeded('goal', accessToken);
      // See TaskFormHost.onSaved: the submit lock MUST be released with the
      // same intent id that beginSubmit received, otherwise the reducer
      // treats SUBMIT_END as stale and the sheet never closes.
      if (createMutationId) {
        sheet.endSubmit(createMutationId);
      }
      sheet.requestClose('success');
    },
    [sheet, currentHousehold, accessToken, createMutationId],
  );

  const onError = useCallback(
    (errorCode: string) => {
      plannerQuickActionsTelemetry.submitFailed('goal', errorCode, accessToken);
    },
    [accessToken],
  );

  return (
    <GoalForm
      mode={mold.mode}
      embedded
      goalId={mold.goalId}
      onClose={onClose}
      onSaved={onSaved}
      createMutationId={createMutationId}
      onSubmitBegin={onSubmitBegin}
      onSubmitEnd={onSubmitEnd}
    />
  );
}

function PlanFormHost() {
  const sheet = usePlannerSheet();
  const { currentHousehold } = useHousehold();
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const [error, setError] = useState<string | null>(null);
  const instanceTagRef = useRef(`sheet:${Math.random().toString(36).slice(2, 8)}`);
  const submitGateRef = useRef(createPlanWriteSingleFlightGate());
  // REC-0A — record mount/unmount of the Plan form host.
  void usePlanCompositionTrace('PlanFormHost');

  const mold = sheet.state as PlannerSheetState & { kind: 'plan_form' };

  // Stable intent per sheet lifecycle. Recreated only when the sheet opens
  // for a new plan form (state.kind changes from a different kind to plan_form).
  // This prevents double identity from inline intent creation.
  const intentRef = useRef<PlannerMutationIntent | null>(null);
  if (!intentRef.current && mold.mode === 'create') {
    intentRef.current = createPlannerMutationIntent({ kind: 'create', entityKind: 'planner.plan' });
    tracePlanWrite({
      operation: 'create',
      stage: 'intent_created',
      surface: 'PlannerSheetHost.PlanFormHost',
      instanceTag: instanceTagRef.current,
      mutationId: intentRef.current.mutationId,
      idempotencyKey: intentRef.current.idempotencyKey,
    });
  }
  const intent = intentRef.current;
  const createMutationId = intent?.mutationId;

  const onClose = useCallback(() => {
    sheet.requestClose('user_request');
  }, [sheet]);

  const onSubmit = useCallback(
    async (request: PlanGraphWriteRequest) => {
      tracePlanWrite({
        operation: 'create',
        stage: 'submit_callback',
        surface: 'PlannerSheetHost.PlanFormHost',
        instanceTag: instanceTagRef.current,
        mutationId: intent?.mutationId,
        idempotencyKey: intent?.idempotencyKey,
      });
      if (!accessToken) {
        setError('No hay sesion activa.');
        return;
      }
      if (!intent) return;

      // Double-tap guard: only one submission inflight at a time.
      if (!submitGateRef.current.acquire(intent.mutationId)) {
        tracePlanWrite({
          operation: 'create',
          stage: 'submit_blocked_inflight',
          surface: 'PlannerSheetHost.PlanFormHost',
          instanceTag: instanceTagRef.current,
          mutationId: intent.mutationId,
          idempotencyKey: intent.idempotencyKey,
        });
        return;
      }
      tracePlanWrite({
        operation: 'create',
        stage: 'enqueue_call',
        surface: 'PlannerSheetHost.PlanFormHost',
        instanceTag: instanceTagRef.current,
        mutationId: intent.mutationId,
        idempotencyKey: intent.idempotencyKey,
      });
      sheet.beginSubmit(intent.mutationId);
      setError(null);
      try {
        await enqueuePlannerPlanGraphWrite(request, intent, 'create');
        if (currentHousehold) {
          plannerCache.executeInvalidation(
            { kind: 'plan', action: 'create' },
            { householdId: currentHousehold.id },
          );
        }
        plannerQuickActionsTelemetry.submitSucceeded('goal', accessToken);
        sheet.endSubmit(intent.mutationId);
        tracePlanWrite({
          operation: 'create',
          stage: 'terminal_callback',
          surface: 'PlannerSheetHost.PlanFormHost',
          instanceTag: instanceTagRef.current,
          mutationId: intent.mutationId,
          idempotencyKey: intent.idempotencyKey,
          status: 'confirmed',
        });
        sheet.requestClose('success');
      } catch (err) {
        plannerQuickActionsTelemetry.submitFailed('goal', 'plan_create_failed', accessToken);
        setError(err instanceof Error ? err.message : 'No pudimos crear el plan.');
        sheet.endSubmit(intent.mutationId);
        tracePlanWrite({
          operation: 'create',
          stage: 'terminal_callback',
          surface: 'PlannerSheetHost.PlanFormHost',
          instanceTag: instanceTagRef.current,
          mutationId: intent.mutationId,
          idempotencyKey: intent.idempotencyKey,
          status: err instanceof Error ? err.name : 'error',
        });
        submitGateRef.current.release(intent.mutationId);
      }
    },
    [accessToken, currentHousehold, sheet, intent],
  );

  return (
    <View>
      {error ? (
        <View style={[S.toastBox, { marginHorizontal: 16, marginBottom: 12 }]}>
          <AppText variant="bodySmall" tone="warning" weight="700" style={{ flex: 1 }}>
            {error}
          </AppText>
        </View>
      ) : null}
      <PlannerPlanMinimalCreateSurface
        initialScope={currentHousehold ? 'household' : 'personal'}
        householdId={currentHousehold?.id ?? null}
        onSubmit={onSubmit}
        onCancel={onClose}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// 4. Host component — single Modal owner
// ---------------------------------------------------------------------------

export function PlannerSheetHost() {
  const sheet = usePlannerSheet();
  const insets = useSafeAreaInsets();
  // REC-0A — record mount/unmount of the single sheet host. There should be
  // exactly one alive instance per authenticated shell.
  void usePlanCompositionTrace('PlannerSheetHost');

  const { state, isOpen, isSubmitting, triggerRef, requestClose } = sheet;

  // Back handler ref (stable identity for addEventListener/removeEventListener)
  const backHandlerRef = useRef<ReturnType<typeof BackHandler.addEventListener> | null>(null);

  // --- Android Back ---
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    backHandlerRef.current = BackHandler.addEventListener('hardwareBackPress', () => {
      if (state.kind === 'closed') return false;

      if (isSubmitting) {
        // Consume the event to prevent accidental close during mutation.
        return true;
      }

      requestClose('back_button');
      return true;
    });

    return () => {
      backHandlerRef.current?.remove();
    };
  }, [state.kind, isSubmitting, requestClose]);

  // --- Accessibility announcement on open ---
  const prevKindRef = useRef(state.kind);
  useEffect(() => {
    let heading: string | null = null;
    if (state.kind !== 'closed') {
      heading = SHEET_HEADINGS[state.kind];
      if (!heading) {
        const mode = state.kind === 'task_form' || state.kind === 'event_form' || state.kind === 'goal_form' || state.kind === 'plan_form'
          ? state.mode
          : 'create';
        heading = `${mode === 'edit' ? 'Editar' : 'Nueva'} ${state.kind.replace('_form', '')}`;
      }
    }

    if (heading && prevKindRef.current !== state.kind) {
      announceSheetOpened(heading);
    }

    prevKindRef.current = state.kind;
  }, [state.kind]);

  // --- Focus return on close ---
  const wasOpenRef = useRef(isOpen);
  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      // Sheet just closed — attempt focus return.
      if (isNodeAccessible(triggerRef)) {
        attemptFocusReturn(triggerRef);
      }
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, triggerRef]);

  // --- Content variant resolver ---
  const content = useMemo(() => {
    switch (state.kind) {
      case 'closed':
        return null;
      case 'actions':
        return <ActionsMenuHost />;
      case 'task_form':
        return <TaskFormHost />;
      case 'event_form':
        return <EventFormHost />;
      case 'goal_form':
        return <GoalFormHost />;
      case 'plan_form':
        return <PlanFormHost />;
    }
  }, [state]);

  // --- Render ---
  const visible = state.kind !== 'closed';
  const canClose = !isSubmitting;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (canClose) requestClose('back_button');
      }}
    >
      <Pressable
        style={[
          S.sheetBackdrop,
          { paddingBottom: insets.bottom },
        ]}
        onPress={() => {
          if (canClose) {
            Keyboard.dismiss();
            requestClose('backdrop');
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={
          canClose ? 'Cerrar panel' : 'Panel bloqueado — operación en curso'
        }
        importantForAccessibility="no"
      >
        <Pressable
          style={[
            S.sheetPanel,
            { marginBottom: insets.bottom },
          ]}
          onPress={(e) => e.stopPropagation()}
          accessibilityRole="none"
          accessibilityLabel={
            state.kind === 'actions'
              ? 'Acciones rápidas'
              : state.kind === 'task_form'
              ? 'Formulario de tarea'
              : state.kind === 'event_form'
              ? 'Formulario de evento'
              : state.kind === 'goal_form'
              ? 'Formulario de plan'
              : state.kind === 'plan_form'
              ? 'Formulario de plan'
              : ''
          }
        >
          {/* Sheet chrome: handle + close button */}
          <View style={S.sheetHandleContainer}>
            <View style={S.sheetHandle} />
            <TouchableOpacity
              style={S.sheetCloseButton}
              onPress={() => {
                if (canClose) {
                  Keyboard.dismiss();
                  requestClose('user_request');
                }
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={
                canClose ? 'Cerrar panel' : 'Cerrar bloqueado — guardando'
              }
              disabled={!canClose}
            >
              <AppText
                variant="micro"
                tone={canClose ? 'tertiary' : 'tertiary'}
                weight="700"
                style={{ opacity: canClose ? 1 : 0.4 }}
              >
                Cerrar
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Content area */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {content}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
