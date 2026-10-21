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
  Animated,
  BackHandler,
  Easing,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomePlusIcon } from '../../constants/icons';
import { colors } from '../../constants/theme';
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
import { PlannerConfirmSheet } from './PlannerConfirmSheet';
import { PlannerConfirmDestructiveSheet } from './PlannerConfirmDestructiveSheet';
import { PlannerSheetGuardView } from './PlannerSheetGuardView';
import { ToastHost } from './ToastHost';
import type { PlannerSheetState } from '../../services/planner/plannerSheetState';
import {
  announceSheetOpened,
  isNodeAccessible,
  attemptFocusReturn,
} from '../../services/planner/plannerSheetFocus';
import {
  PLANNER_SHEET_GUARD_COPY,
  resolveDragDismiss,
  resolveInitialSheetDetent,
  resolveSheetDetent,
  type PlannerSheetDetent,
} from '../../services/planner/plannerSheetGuard';
import { useKeyboardVisible } from '../../hooks/useKeyboardVisible';
import { useReduceMotion } from '../../hooks/useReduceMotion';
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
// S7: invalidación dirigida del read model "Próximo" del activo.
import { invalidateAssetPlannerItems } from '../../services/assets/plannerItems';
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

function TaskFormHost({ onEmbeddedContentSizeChange }: { onEmbeddedContentSizeChange?: (height: number) => void }) {
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
    sheet.attemptClose('user_request');
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
      // S7: cuando la Task nació de un activo, el read model "Próximo" del
      // activo también queda stale. Invalidación dirigida (sin event bus).
      if (mold.assetRef && currentHousehold) {
        invalidateAssetPlannerItems(currentHousehold.id, mold.assetRef.assetId);
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
    [sheet, currentHousehold, accessToken, createMutationId, mold.assetRef],
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
      // Plan context must reach the form: without these the create payload loses
      // `goal_id` + `plan_classification` and a Task created from a Plan is NOT
      // linked to it.
      initialPlanId={mold.initialPlanId}
      initialPlanTitle={mold.initialPlanTitle}
      // S7: el activo de origen viaja hasta el composer real de Planner.
      assetRef={mold.assetRef}
      // S7: la identidad del intento (mutationId + Idempotency-Key) la genera
      // el host y la reusan TODOS los reintentos, incluso los que pasan por
      // la fachada de Assets.
      createIntent={intent ?? undefined}
      onClose={onClose}
      onSaved={onSaved}
      createMutationId={createMutationId}
      onSubmitBegin={onSubmitBegin}
      onSubmitEnd={onSubmitEnd}
      onEmbeddedContentSizeChange={onEmbeddedContentSizeChange}
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
    sheet.attemptClose('user_request');
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
      // S7: cuando el Event nació de un activo, el read model "Próximo" del
      // activo también queda stale. Invalidación dirigida (sin event bus).
      if (mold.assetRef && currentHousehold) {
        invalidateAssetPlannerItems(currentHousehold.id, mold.assetRef.assetId);
      }
      // See TaskFormHost.onSaved: the submit lock MUST be released with the
      // same intent id that beginSubmit received, otherwise the reducer
      // treats SUBMIT_END as stale and the sheet never closes (the 22023 /
      // 201 -> sheet stays open chain observed on Android).
      if (createMutationId) {
        sheet.endSubmit(createMutationId);
      }
      sheet.requestClose('success');
    },
    [sheet, currentHousehold, accessToken, createMutationId, mold.assetRef],
  );

  return (
    <EventForm
      mode={mold.mode}
      embedded
      eventId={mold.eventId}
      initialDate={mold.initialDate}
      // S7: el activo de origen viaja hasta el composer real de Planner.
      assetRef={mold.assetRef}
      // S7: la identidad del intento (mutationId + Idempotency-Key) la genera
      // el host y la reusan TODOS los reintentos, incluso los que pasan por
      // la fachada de Assets.
      createIntent={intent ?? undefined}
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
    sheet.attemptClose('user_request');
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

// Non-reactive identity for one mounted Plan form host.
function createSheetInstanceTag(): string {
  return `sheet:${Math.random().toString(36).slice(2, 8)}`;
}

function PlanFormHost() {
  const sheet = usePlannerSheet();
  const { currentHousehold } = useHousehold();
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const [error, setError] = useState<string | null>(null);
  // A lazy state initializer runs once for this mounted host. Calling the
  // generator as a `useRef` argument would still evaluate it on every render.
  const [instanceTag] = useState(createSheetInstanceTag);
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
      instanceTag,
      mutationId: intentRef.current.mutationId,
      idempotencyKey: intentRef.current.idempotencyKey,
    });
  }
  const intent = intentRef.current;
  const createMutationId = intent?.mutationId;

  const onClose = useCallback(() => {
    sheet.attemptClose('user_request');
  }, [sheet]);

  const onSubmit = useCallback(
    async (request: PlanGraphWriteRequest) => {
      tracePlanWrite({
        operation: 'create',
        stage: 'submit_callback',
        surface: 'PlannerSheetHost.PlanFormHost',
        instanceTag,
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
          instanceTag,
          mutationId: intent.mutationId,
          idempotencyKey: intent.idempotencyKey,
        });
        return;
      }
      tracePlanWrite({
        operation: 'create',
        stage: 'enqueue_call',
        surface: 'PlannerSheetHost.PlanFormHost',
        instanceTag,
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
          instanceTag,
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
          instanceTag,
          mutationId: intent.mutationId,
          idempotencyKey: intent.idempotencyKey,
          status: err instanceof Error ? err.name : 'error',
        });
        submitGateRef.current.release(intent.mutationId);
      }
    },
    [accessToken, currentHousehold, instanceTag, sheet, intent],
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Figma V1.1 motion contract for sheets (§07.6 / §11.1 M-13..M-15):
 * - open: translateY(24px) + opacity, 300 ms, deceleration;
 * - close: translateY(0→24px) + opacity 1→0, 200 ms, acceleration;
 * - the sheet stays mounted during its exit;
 * - exit is always faster than entrance.
 */
const SHEET_ENTER_DURATION_MS = 300;
const SHEET_EXIT_DURATION_MS = 200;
const SHEET_RISE_DISTANCE_PX = 24;
const SHEET_ENTER_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const SHEET_EXIT_EASING = Easing.bezier(0.55, 0, 1, 0.45);
/** Drag must travel this far before it can claim a touch (px). */
const DRAG_CLAIM_DISTANCE_PX = 10;
/** Content drag additionally requires the host scroll to be at the top (px). */
const CONTENT_DRAG_SCROLL_TOP_PX = 2;
const MIN_USEFUL_FORM_HEIGHT_PX = 440;
const FORM_CHROME_AND_FOOTER_HEIGHT_PX = 104;
const MAX_INITIAL_DETENT_FRACTION = 0.78;
const DETENT_SETTLE_DURATION_MS = 180;

type SheetExitStyle = 'standard' | 'drag';

export function PlannerSheetHost() {
  const sheet = usePlannerSheet();
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const keyboardVisible = useKeyboardVisible();
  const reduceMotion = useReduceMotion();
  // REC-0A — record mount/unmount of the single sheet host. There should be
  // exactly one alive instance per authenticated shell.
  void usePlanCompositionTrace('PlannerSheetHost');

  const { state, isOpen, isSubmitting, askingDismiss, triggerRef, attemptClose, discardFromGuard } = sheet;
  const contentManagesVerticalScroll = state.kind === 'task_form'
    || state.kind === 'event_form'
    || state.kind === 'goal_form'
    || state.kind === 'plan_form';
  const isFormSheet = contentManagesVerticalScroll;

  // Back handler ref (stable identity for addEventListener/removeEventListener)
  const backHandlerRef = useRef<ReturnType<typeof BackHandler.addEventListener> | null>(null);

  // --- Presentation animation state ---
  // `mounted` keeps the Modal alive while the exit animation runs (Figma:
  // "la hoja sigue montada durante su salida").
  const [mounted, setMounted] = useState(false);
  const mountedRef = useRef(false);
  mountedRef.current = mounted;
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const riseRef = useRef(new Animated.Value(SHEET_RISE_DISTANCE_PX)).current;
  const fadeRef = useRef(new Animated.Value(0)).current;
  const riseValueRef = useRef(SHEET_RISE_DISTANCE_PX);
  const fadeValueRef = useRef(0);
  const expandedHeight = Math.max(360, Math.round(viewportHeight - Math.max(insets.top + 16, viewportHeight * 0.1)));
  const defaultInitialHeight = Math.min(
    expandedHeight,
    Math.max(MIN_USEFUL_FORM_HEIGHT_PX, Math.round(viewportHeight * 0.66)),
  );
  const initialHeightRef = useRef(defaultInitialHeight);
  const expandedHeightRef = useRef(expandedHeight);
  expandedHeightRef.current = expandedHeight;
  const panelHeight = useRef(new Animated.Value(defaultInitialHeight)).current;
  const panelHeightValueRef = useRef(defaultInitialHeight);
  const panelHeightRef = panelHeightValueRef;
  const detentRef = useRef<PlannerSheetDetent>('initial');
  const measuredInitialContentRef = useRef(false);
  const exitStyleRef = useRef<SheetExitStyle>('standard');
  const animatingRef = useRef(false);

  useEffect(() => {
    const riseListener = riseRef.addListener(({ value }) => { riseValueRef.current = value; });
    const fadeListener = fadeRef.addListener(({ value }) => { fadeValueRef.current = value; });
    const heightListener = panelHeight.addListener(({ value }) => { panelHeightValueRef.current = value; });
    return () => {
      riseRef.removeListener(riseListener);
      fadeRef.removeListener(fadeListener);
      panelHeight.removeListener(heightListener);
    };
  }, [riseRef, fadeRef, panelHeight]);

  const setPanelHeight = useCallback((next: number, animated = true) => {
    const bounded = Math.max(initialHeightRef.current, Math.min(expandedHeightRef.current, next));
    if (!animated || reduceMotion) {
      panelHeight.setValue(bounded);
      return;
    }
    Animated.timing(panelHeight, {
      toValue: bounded,
      duration: DETENT_SETTLE_DURATION_MS,
      easing: SHEET_ENTER_EASING,
      useNativeDriver: false,
    }).start();
  }, [panelHeight, reduceMotion]);

  const settleToDetent = useCallback((next: PlannerSheetDetent) => {
    const target = next === 'expanded' ? expandedHeightRef.current : initialHeightRef.current;
    detentRef.current = next;
    setPanelHeight(target);
    Animated.parallel([
      Animated.spring(riseRef, { toValue: 0, useNativeDriver: true, friction: 10, tension: 130 }),
      Animated.timing(fadeRef, {
        toValue: 1,
        duration: reduceMotion ? 0 : SHEET_EXIT_DURATION_MS,
        easing: SHEET_ENTER_EASING,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeRef, reduceMotion, riseRef, setPanelHeight]);

  const settleBack = useCallback(() => settleToDetent(detentRef.current), [settleToDetent]);

  const animateIn = useCallback(() => {
    exitStyleRef.current = 'standard';
    animatingRef.current = true;
    Animated.parallel([
      Animated.timing(riseRef, {
        toValue: 0,
        duration: reduceMotion ? 0 : SHEET_ENTER_DURATION_MS,
        easing: SHEET_ENTER_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(fadeRef, {
        toValue: 1,
        duration: reduceMotion ? 0 : SHEET_ENTER_DURATION_MS,
        easing: SHEET_ENTER_EASING,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) animatingRef.current = false;
    });
  }, [fadeRef, reduceMotion, riseRef]);

  const animateOut = useCallback(() => {
    animatingRef.current = true;
    const fromDrag = exitStyleRef.current === 'drag';
    exitStyleRef.current = 'standard';
    const travel = fromDrag ? panelHeightValueRef.current : SHEET_RISE_DISTANCE_PX;
    Animated.parallel([
      Animated.timing(riseRef, {
        toValue: travel,
        duration: reduceMotion ? 0 : SHEET_EXIT_DURATION_MS,
        easing: SHEET_EXIT_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(fadeRef, {
        toValue: 0,
        duration: reduceMotion ? 0 : SHEET_EXIT_DURATION_MS,
        easing: SHEET_EXIT_EASING,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      animatingRef.current = false;
      // Only unmount when this exit was not interrupted by a re-open
      // (rapid open/close sequences animate back from wherever they are).
      if (finished && !isOpenRef.current) {
        setMounted(false);
      }
    });
  }, [fadeRef, reduceMotion, riseRef]);

  useEffect(() => {
    if (isOpen) {
      if (!mountedRef.current) {
        // Modal's first visible frame must already be hidden and offset.
        // Starting the animation before it has painted causes a final-position
        // flash on some native modal implementations.
        riseRef.setValue(SHEET_RISE_DISTANCE_PX);
        fadeRef.setValue(0);
        detentRef.current = 'initial';
        panelHeight.setValue(initialHeightRef.current);
        setMounted(true);
        return;
      }
      animateIn();
    } else if (mountedRef.current) {
      if (fadeValueRef.current <= 0.02 && riseValueRef.current >= panelHeightRef.current - 1) {
        // Drag already carried the sheet fully out: nothing left to animate.
        setMounted(false);
        return;
      }
      animateOut();
    }
  // `mounted` is intentionally included: opening first mounts the transparent
  // Modal, then the following committed render starts the entrance animation.
  // Without it, the Modal can remain at opacity 0 while its backdrop captures
  // every touch, which looks like a frozen Planner after tapping `+`.
  }, [isOpen, mounted, animateIn, animateOut, fadeRef, panelHeight, panelHeightRef, riseRef]);

  // The task's initial intrinsic body chooses a useful starting detent once
  // per presentation. Later optional details and validation changes stay in
  // the ScrollView, so the whole panel does not teleport while editing.
  const onTaskEmbeddedContentSizeChange = useCallback((contentHeight: number) => {
    if (state.kind !== 'task_form' || measuredInitialContentRef.current) return;
    measuredInitialContentRef.current = true;
    const measured = resolveInitialSheetDetent({
      contentHeight,
      expandedHeight: expandedHeightRef.current,
      minimumHeight: MIN_USEFUL_FORM_HEIGHT_PX,
      chromeAndFooterHeight: FORM_CHROME_AND_FOOTER_HEIGHT_PX,
      maximumInitialFraction: MAX_INITIAL_DETENT_FRACTION,
    });
    initialHeightRef.current = measured;
    if (detentRef.current === 'initial') setPanelHeight(measured);
  }, [setPanelHeight, state.kind]);

  useEffect(() => {
    if (state.kind === 'closed') {
      measuredInitialContentRef.current = false;
      initialHeightRef.current = defaultInitialHeight;
      return;
    }
    if (state.kind !== 'task_form') initialHeightRef.current = defaultInitialHeight;
  }, [defaultInitialHeight, state.kind]);

  // --- Interactive drag-to-dismiss ---
  // Refs mirror the reactive values so the (single) PanResponder instance
  // always reads fresh state without re-claiming mid-gesture.
  const isSubmittingRef = useRef(isSubmitting);
  isSubmittingRef.current = isSubmitting;
  const askingRef = useRef(askingDismiss);
  askingRef.current = askingDismiss;
  const attemptCloseRef = useRef(attemptClose);
  attemptCloseRef.current = attemptClose;
  const keyboardVisibleRef = useRef(keyboardVisible);
  keyboardVisibleRef.current = keyboardVisible;
  // PanResponder is deliberately created once, so mirror this reactive value
  // instead of capturing the initial `closed` state (which would let a form
  // scroll accidentally claim sheet dragging after it opens).
  const contentManagesVerticalScrollRef = useRef(contentManagesVerticalScroll);
  contentManagesVerticalScrollRef.current = contentManagesVerticalScroll;
  const scrollTopRef = useRef(0);
  const dragStartHeightRef = useRef(defaultInitialHeight);

  const releaseDrag = useCallback(
    (downwardTravel: number, vy: number) => {
      if (downwardTravel > 0) {
        const decision = resolveDragDismiss({
          dy: downwardTravel,
          vy,
          panelHeight: panelHeightRef.current,
        });
        if (decision === 'dismiss') {
          const closeDecision = attemptCloseRef.current('user_request');
          if (closeDecision === 'close') {
            exitStyleRef.current = 'drag';
            return;
          }
        }
        settleBack();
        return;
      }
      settleToDetent(resolveSheetDetent({
        currentHeight: panelHeightValueRef.current,
        initialHeight: initialHeightRef.current,
        expandedHeight: expandedHeightRef.current,
        vy,
      }));
    },
    [panelHeightRef, settleBack, settleToDetent],
  );

  const beginDrag = useCallback(() => {
    dragStartHeightRef.current = panelHeightValueRef.current;
  }, []);

  const moveDrag = useCallback((dy: number) => {
    const initial = initialHeightRef.current;
    const expanded = expandedHeightRef.current;
    if (dy < 0) {
      panelHeight.setValue(Math.min(expanded, Math.max(initial, dragStartHeightRef.current - dy)));
      riseRef.setValue(0);
      return;
    }
    const collapseTravel = Math.max(0, dragStartHeightRef.current - initial);
    panelHeight.setValue(Math.max(initial, dragStartHeightRef.current - Math.min(dy, collapseTravel)));
    riseRef.setValue(Math.max(0, dy - collapseTravel));
  }, [panelHeight, riseRef]);

  // Chrome drag: the handle strip is an honest drag affordance. Capture-phase
  // claiming also steals a drag that began on the close button (a press without
  // a downward move still reaches the button untouched).
  const chromePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_event, gesture) => {
        if (isSubmittingRef.current || askingRef.current) return false;
        if (Math.abs(gesture.dy) <= DRAG_CLAIM_DISTANCE_PX || Math.abs(gesture.dx) > Math.abs(gesture.dy)) return false;
        if (keyboardVisibleRef.current) Keyboard.dismiss();
        return true;
      },
      onPanResponderGrant: beginDrag,
      onPanResponderMove: (_event, gesture) => moveDrag(gesture.dy),
      onPanResponderRelease: (_event, gesture) => {
        const collapseTravel = Math.max(0, dragStartHeightRef.current - initialHeightRef.current);
        releaseDrag(Math.max(0, gesture.dy - collapseTravel), gesture.vy);
      },
      onPanResponderTerminate: () => {
        settleBack();
      },
    }),
  ).current;

  // Non-form sheets scroll in the host ScrollView. The ScrollView claims the
  // touchstart, so the wrapper must steal the gesture during the MOVE capture
  // phase — but only while the scroll rests at the top, so inner scrolling
  // never competes with sheet dragging.
  const contentPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_event, gesture) => {
        if (isSubmittingRef.current || askingRef.current) return false;
        if (contentManagesVerticalScrollRef.current) return false;
        if (scrollTopRef.current > CONTENT_DRAG_SCROLL_TOP_PX) return false;
        if (gesture.dy <= DRAG_CLAIM_DISTANCE_PX || gesture.vy <= 0 || Math.abs(gesture.dx) > Math.abs(gesture.dy)) return false;
        if (keyboardVisibleRef.current) Keyboard.dismiss();
        return true;
      },
      onPanResponderGrant: beginDrag,
      onPanResponderMove: (_event, gesture) => moveDrag(gesture.dy),
      onPanResponderRelease: (_event, gesture) => {
        const collapseTravel = Math.max(0, dragStartHeightRef.current - initialHeightRef.current);
        releaseDrag(Math.max(0, gesture.dy - collapseTravel), gesture.vy);
      },
      onPanResponderTerminate: () => {
        settleBack();
      },
    }),
  ).current;

  // --- Android Back ---
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    backHandlerRef.current = BackHandler.addEventListener('hardwareBackPress', () => {
      if (state.kind === 'closed') return false;

      if (isSubmitting) {
        // Consume the event to prevent accidental close during mutation.
        return true;
      }

      attemptClose('back_button');
      return true;
    });

    return () => {
      backHandlerRef.current?.remove();
    };
  }, [state.kind, isSubmitting, attemptClose]);

  // --- Accessibility announcements ---
  const prevKindRef = useRef(state.kind);
  useEffect(() => {
    let heading: string | null = null;
    if (askingDismiss) {
      heading = PLANNER_SHEET_GUARD_COPY.title;
    } else if (state.kind !== 'closed') {
      heading = SHEET_HEADINGS[state.kind];
      if (!heading) {
        const mode = state.kind === 'task_form' || state.kind === 'event_form' || state.kind === 'goal_form' || state.kind === 'plan_form'
          ? state.mode
          : 'create';
        heading = `${mode === 'edit' ? 'Editar' : 'Nueva'} ${state.kind.replace('_form', '')}`;
      }
    }

    if (heading && (prevKindRef.current !== state.kind || askingDismiss)) {
      announceSheetOpened(heading);
    }

    prevKindRef.current = state.kind;
  }, [state, askingDismiss]);

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
        return <TaskFormHost onEmbeddedContentSizeChange={onTaskEmbeddedContentSizeChange} />;
      case 'event_form':
        return <EventFormHost />;
      case 'goal_form':
        return <GoalFormHost />;
      case 'plan_form':
        return <PlanFormHost />;
      case 'confirm':
        return <PlannerConfirmSheet data={state.data} />;
      case 'confirm_destructive':
        return <PlannerConfirmDestructiveSheet data={state.data} />;
    }
  }, [state, onTaskEmbeddedContentSizeChange]);

  // --- Render ---
  const visible = mounted;
  const canClose = !isSubmitting;

  // Forms use a measured two-detent height. Other sheets remain intrinsic;
  // the discard question intentionally wraps its own content.
  const isTallForm = isFormSheet && !askingDismiss;
  const panelStyle = [
    S.sheetPanel,
    isTallForm && { height: panelHeight, maxHeight: expandedHeight },
    !isTallForm && { minHeight: 0 },
  ];

  const handleBackdropPress = () => {
    if (!canClose) return;
    // With the keyboard up, a backdrop tap is "tap outside the input": dismiss
    // the keyboard and keep the sheet (and its draft) intact.
    if (keyboardVisible) {
      Keyboard.dismiss();
      return;
    }
    attemptClose('backdrop');
  };

  const panelAccessibleName = askingDismiss
    ? PLANNER_SHEET_GUARD_COPY.title
    : state.kind === 'actions'
      ? 'Acciones rápidas'
      : state.kind === 'task_form'
      ? 'Formulario de tarea'
      : state.kind === 'event_form'
      ? 'Formulario de evento'
      : state.kind === 'goal_form'
      ? 'Formulario de plan'
      : state.kind === 'plan_form'
      ? 'Formulario de plan'
      : state.kind === 'confirm'
      ? 'Confirmar'
      : state.kind === 'confirm_destructive'
      ? 'Confirmar eliminación'
      : '';

  return (
    <>
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => {
        attemptClose('back_button');
      }}
      statusBarTranslucent
    >
      <View style={{ flex: 1 }}>
        <AnimatedPressable
          style={[S.sheetBackdropLayer, { opacity: fadeRef }]}
          onPress={handleBackdropPress}
          accessibilityRole="button"
          accessibilityLabel={
            askingDismiss
              ? PLANNER_SHEET_GUARD_COPY.keepEditing
              : canClose ? 'Cerrar panel' : 'Panel bloqueado — operación en curso'
          }
          importantForAccessibility="no"
        />
        <View style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
          <Animated.View
            style={{ transform: [{ translateY: riseRef }], opacity: fadeRef }}
            pointerEvents="box-none"
          >
            <AnimatedPressable
              style={panelStyle}
              onLayout={(event) => {
                panelHeightRef.current = event.nativeEvent.layout.height;
              }}
              accessibilityRole="none"
              accessibilityLabel={panelAccessibleName}
              accessibilityViewIsModal
            >
              {/* Sheet chrome: handle + close button. The handle is an honest
                  drag affordance: it moves the sheet and can dismiss it. */}
              <View
                style={S.sheetHandleContainer}
                {...chromePanResponder.panHandlers}
              >
                <Pressable
                  style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => settleToDetent(detentRef.current === 'expanded' ? 'initial' : 'expanded')}
                accessibilityRole="button"
                accessibilityLabel={detentRef.current === 'expanded' ? 'Contraer panel' : 'Expandir panel'}
                accessibilityHint="Arrastrá hacia arriba o abajo para cambiar el tamaño del panel"
                >
                  <View style={S.sheetHandle} />
                </Pressable>
                <TouchableOpacity
                  style={S.sheetCloseButton}
                  onPress={() => {
                    if (canClose) {
                      Keyboard.dismiss();
                      attemptClose('user_request');
                    }
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    askingDismiss
                      ? 'Volver al formulario'
                      : canClose ? 'Cerrar panel' : 'Cerrar bloqueado — guardando'
                  }
                  disabled={!canClose}
                >
                  <HomePlusIcon name="close" size={20} color={colors.text.tertiary} style={{ opacity: canClose ? 1 : 0.4 }} />
                </TouchableOpacity>
              </View>

              {askingDismiss ? (
                // The guard REPLACES the visible body (Figma §23.7.3), but the
                // form below stays mounted (hidden) so its draft state
                // survives: `Seguir editando` must restore it byte for byte.
                <PlannerSheetGuardView
                  onKeepEditing={() => attemptClose('user_request')}
                  onDiscard={() => discardFromGuard('user_request')}
                />
              ) : null}
              <View
                style={{ flex: 1, minHeight: 0, display: askingDismiss ? 'none' : 'flex' }}
              >
                {contentManagesVerticalScroll ? content : (
                  <View style={{ flex: 1, minHeight: 0 }} {...contentPanResponder.panHandlers}>
                    <ScrollView
                      style={{ flex: 1 }}
                      contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
                      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                      onScroll={(event) => {
                        scrollTopRef.current = event.nativeEvent.contentOffset.y;
                      }}
                      scrollEventThrottle={16}
                    >
                      {content}
                    </ScrollView>
                  </View>
                )}
              </View>
            </AnimatedPressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
    {/* A toast reports mutations from the Planner root, where no sheet is
        visible. Keeping it outside Modal makes that feedback reachable while
        ToastHost still suppresses itself whenever a sheet owns the surface. */}
    <ToastHost sheetOpen={isOpen} />
    </>
  );
}
