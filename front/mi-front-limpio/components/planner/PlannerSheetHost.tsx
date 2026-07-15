/**
 * Planner V1 — M3 PlannerSheetHost.
 *
 * Purpose (frozen by `planner_v1_implementation_order.md` §M3):
 * - Single `Modal` component for all Planner sheets (actions menu, task form,
 *   event form, goal form slot).
 * - Renders content according to `PlannerSheetState.kind`.
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
 * - Form logic (each form owns its fields and validations).
 * - Quick Actions design (belongs to M4).
 * - Goal Quick Create product flow (belongs to M5).
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
import { EventForm } from '../../screens/planner/EventForm';
import { TaskForm } from '../../screens/planner/TaskForm';
import { GoalForm } from '../../screens/planner/GoalForm';
import { QuickActionSheet } from '../ui/QuickActionSheet';
import type { PlannerSheetState } from '../../services/planner/plannerSheetState';
import {
  announceSheetOpened,
  isNodeAccessible,
  attemptFocusReturn,
} from '../../services/planner/plannerSheetFocus';

// ---------------------------------------------------------------------------
// 1. Heading map (a11y announcement text)
// ---------------------------------------------------------------------------

const SHEET_HEADINGS: Record<string, string> = {
  actions: 'Crear: acciones rápidas',
  task_form: 'Formulario: nueva tarea',
  event_form: 'Formulario: nuevo evento',
  goal_form: 'Formulario: nueva meta',
};

// ---------------------------------------------------------------------------
// 2. Actions menu adapter (minimal structural; design finalized in M4)
// ---------------------------------------------------------------------------

function ActionsMenu() {
  const { openTaskForm, openEventForm, isSubmitting } = usePlannerSheet();

  const handleOpenTask = useCallback(() => {
    if (isSubmitting) return;
    openTaskForm({ source: 'quick_action' });
  }, [openTaskForm, isSubmitting]);

  const handleOpenEvent = useCallback(() => {
    if (isSubmitting) return;
    openEventForm({ source: 'quick_action' });
  }, [openEventForm, isSubmitting]);

  // Reuse existing QuickActionSheet as presentational; M4 will wire real
  // capabilities and final design. During M3 this is a structural adapter.
  return (
    <QuickActionSheet
      visible
      onRequestClose={() => {}}
      onNavigate={(screen) => {
        if (screen === 'CreateTask') handleOpenTask();
        else if (screen === 'CreateEvent') handleOpenEvent();
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// 3. Form adapters (wrap existing forms with close/success + submit lock)
// ---------------------------------------------------------------------------

function TaskFormHost() {
  const sheet = usePlannerSheet();

  const mold = sheet.state as PlannerSheetState & { kind: 'task_form' };

  const onClose = useCallback(() => {
    sheet.requestClose('user_request');
  }, [sheet]);

  const onSaved = useCallback(
    (message: string) => {
      sheet.endSubmit('task_intent');
      sheet.requestClose('success');
    },
    [sheet],
  );

  return (
    <TaskForm
      mode={mold.mode}
      embedded
      taskId={mold.taskId}
      initialDueDate={mold.initialDueDate}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function EventFormHost() {
  const sheet = usePlannerSheet();

  const mold = sheet.state as PlannerSheetState & { kind: 'event_form' };

  const onClose = useCallback(() => {
    sheet.requestClose('user_request');
  }, [sheet]);

  const onSaved = useCallback(
    (message: string) => {
      sheet.endSubmit('event_intent');
      sheet.requestClose('success');
    },
    [sheet],
  );

  return (
    <EventForm
      mode={mold.mode}
      embedded
      eventId={mold.eventId}
      initialDate={mold.initialDate}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

/**
 * GoalFormSlot: the contract is defined (kind: 'goal_form') so types and the
 * host accept it, but the productive flow remains deferred to M5.
 *
 * During M3 the adapter renders GoalForm inside the host when
 * `kind === 'goal_form'`, using the same close/saved/embedded contract as
 * Task and Event. The quick action menu guards the Goal entry until M5.
 */
function GoalFormSlot() {
  const sheet = usePlannerSheet();

  const mold = sheet.state as PlannerSheetState & { kind: 'goal_form' };

  const onClose = useCallback(() => {
    sheet.requestClose('user_request');
  }, [sheet]);

  const onSaved = useCallback(
    (message: string) => {
      sheet.endSubmit('goal_intent');
      sheet.requestClose('success');
    },
    [sheet],
  );

  return (
    <GoalForm
      mode={mold.mode}
      embedded
      goalId={mold.goalId}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

// ---------------------------------------------------------------------------
// 4. Host component — single Modal owner
// ---------------------------------------------------------------------------

export function PlannerSheetHost() {
  const sheet = usePlannerSheet();
  const insets = useSafeAreaInsets();

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
        const mode = state.kind === 'task_form' || state.kind === 'event_form' || state.kind === 'goal_form'
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
        return <ActionsMenu />;
      case 'task_form':
        return <TaskFormHost />;
      case 'event_form':
        return <EventFormHost />;
      case 'goal_form':
        return <GoalFormSlot />;
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
              ? 'Formulario de meta'
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

