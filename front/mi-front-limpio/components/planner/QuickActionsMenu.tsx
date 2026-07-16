/**
 * Planner V1 — M4 QuickActionsMenu (final visual design).
 *
 * Purpose:
 * - Renders the final Quick Actions menu inside the single sheet host.
 * - Consumes canonical catalog (`plannerQuickActions`), capabilities
 *   projection, and sheet controller.
 * - Each action row opens the corresponding form via the state machine.
 * - Capability-denied and deferred actions (Goal in M4) are hidden.
 * - No own Modal; no own submit; no domain logic.
 *
 * This component replaces the placeholder `ActionsMenu` (M3) and the
 * legacy `QuickActionSheet` as presentational rendering inside the host.
 */

import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../ui/AppText';
import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, spacing } from '../../constants/theme';
import {
  plannerQuickActions,
  type PlannerQuickActionDefinition,
} from '../../services/planner/plannerQuickActions';
import {
  usePlannerSheet,
  type PlannerSheetController,
} from '../../context/PlannerSheetContext';
import {
  fetchPlannerCapabilitiesCached,
  type PlannerCapabilitiesProjection,
} from '../../services/plannerCapabilities';

// ---------------------------------------------------------------------------
// Title
// ---------------------------------------------------------------------------

const MENU_TITLE = 'Crear';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getActionState(
  action: PlannerQuickActionDefinition,
  projection: PlannerCapabilitiesProjection | null | undefined,
  isSubmitting: boolean,
): 'hidden' | 'enabled' | 'disabled' {
  if (!action.implemented) return 'hidden';
  if (!action.requiredCapabilityGuard(projection)) return 'hidden';
  if (isSubmitting) return 'disabled';
  return 'enabled';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Props:
 * - `capabilities`: the resolved projection. When null the menu shows nothing (deny-safe).
 * - `capabilitiesLoading`: true while the projection is still being resolved.
 * - `onActionSelected`: optional callback for telemetry/monitoring when an action is tapped.
 */
type QuickActionsMenuProps = {
  capabilities: PlannerCapabilitiesProjection | null;
  capabilitiesLoading: boolean;
  onActionSelected?: (actionType: 'task' | 'event' | 'goal') => void;
};

export function QuickActionsMenu({ capabilities, capabilitiesLoading, onActionSelected }: QuickActionsMenuProps) {
  const sheet = usePlannerSheet();

  const handleOpenTask = useCallback(() => {
    if (sheet.isSubmitting) return;
    onActionSelected?.('task');
    sheet.openTaskForm({ source: 'quick_action' });
  }, [sheet, onActionSelected]);

  const handleOpenEvent = useCallback(() => {
    if (sheet.isSubmitting) return;
    onActionSelected?.('event');
    sheet.openEventForm({ source: 'quick_action' });
  }, [sheet, onActionSelected]);

  const handleOpenGoal = useCallback(() => {
    if (sheet.isSubmitting) return;
    onActionSelected?.('goal');
    sheet.openGoalForm({ source: 'quick_action' });
  }, [sheet, onActionSelected]);

  const visibleActions = useMemo(() => {
    if (capabilitiesLoading || !capabilities) return [];
    return plannerQuickActions.catalog.filter((a) => {
      if (!a.implemented) return false;
      return a.requiredCapabilityGuard(capabilities);
    });
  }, [capabilities, capabilitiesLoading]);

  const handlers: Record<string, () => void> = {
    create_task: handleOpenTask,
    create_event: handleOpenEvent,
    create_goal: handleOpenGoal,
  };

  if (visibleActions.length === 0) {
    // Deny-safe: no visible actions → show empty state.
    // This should not normally happen once capabilities are loaded, but
    // protects against edge cases (e.g. all capabilities revoked).
    return (
      <View style={styles.emptyContainer}>
        <AppText variant="body" tone="secondary" align="center">
          No tenés acciones disponibles en este hogar.
        </AppText>
      </View>
    );
  }

  return (
    <View>
      {/* Title */}
      <View style={styles.titleContainer}>
        <AppText variant="title3" weight="800">
          {MENU_TITLE}
        </AppText>
      </View>

      {/* Action rows */}
      <View style={[styles.rowsContainer, { gap: spacing[2] }]}>
        {visibleActions.map((action) => {
          const state = getActionState(action, capabilities, sheet.isSubmitting);
          const isDisabled = state === 'disabled';
          const handler = handlers[action.key];

          return (
            <Pressable
              key={action.key}
              onPress={handler}
              disabled={isDisabled}
              style={({ pressed }) => [
                styles.actionRow,
                pressed && styles.actionRowPressed,
                isDisabled && styles.actionRowDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={action.accessibilityLabel}
              accessibilityState={{
                disabled: isDisabled,
                busy: sheet.isSubmitting,
              }}
            >
              {/* Icon circle */}
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: action.iconBackgroundColor },
                  isDisabled && styles.actionIconDisabled,
                ]}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                <HomePlusIcon
                  name={action.iconName as any}
                  size={22}
                  color={isDisabled ? colors.text.tertiary : action.iconColor}
                />
              </View>

              {/* Label + description */}
              <View style={styles.actionInfo}>
                <AppText
                  variant="body"
                  weight="700"
                  tone={isDisabled ? 'tertiary' : 'primary'}
                >
                  {action.label}
                </AppText>
                <AppText
                  variant="caption"
                  tone="secondary"
                >
                  {action.description}
                </AppText>
              </View>

              {/* Chevron */}
              <HomePlusIcon
                name="chevron-forward"
                size={20}
                color={isDisabled ? colors.text.tertiary : colors.text.tertiary}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles (consistent with HomePlus design tokens, no emojis, no gradients)
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  emptyContainer: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[8],
  },
  titleContainer: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[3],
    marginBottom: spacing[2],
  },
  rowsContainer: {
    paddingHorizontal: spacing[4],
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.default,
    minHeight: 56, // accessible touch target
  },
  actionRowPressed: {
    opacity: 0.86,
    backgroundColor: colors.surface.card,
    borderColor: colors.terracotta[300],
  },
  actionRowDisabled: {
    opacity: 0.58,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconDisabled: {
    opacity: 0.5,
  },
  actionInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
});