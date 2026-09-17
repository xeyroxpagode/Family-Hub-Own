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
import { useNavigation } from '@react-navigation/native';

import { AppText } from '../ui/AppText';
import { HomePlusIcon } from '../../constants/icons';
import { colors, radius, spacing } from '../../constants/theme';
import { ROUTE_NAMES } from '../../navigation/plannerNavigationContract';
import {
  plannerQuickActions,
  type PlannerQuickActionDefinition,
} from '../../services/planner/plannerQuickActions';
import {
  usePlannerSheet,
} from '../../context/PlannerSheetContext';
import {
  type PlannerCapabilitiesProjection,
} from '../../services/plannerCapabilities';

// ---------------------------------------------------------------------------
// Title
// ---------------------------------------------------------------------------

const QUICK_ACTIONS_TITLE = 'Acciones rápidas';
const SEARCH_LABEL = 'Buscar en HomePlus...';

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
  const navigation = useNavigation<any>();

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
    sheet.openPlanForm({ source: 'quick_action' });
  }, [sheet, onActionSelected]);

  const visibleActions = useMemo(() => {
    if (capabilitiesLoading || !capabilities) return [];
    return plannerQuickActions.catalog.filter((a) => {
      if (!a.implemented) return false;
      return a.requiredCapabilityGuard(capabilities);
    });
  }, [capabilities, capabilitiesLoading]);

  const searchVisible = capabilitiesLoading || capabilities?.['planner.search'] === true;
  const searchEnabled = capabilities?.['planner.search'] === true && !sheet.isSubmitting;

  const handleOpenSearch = useCallback(() => {
    if (!searchEnabled) return;
    sheet.requestClose('user_request');
    navigation.navigate('HomeTabs', {
      screen: 'PlannerTab',
      params: {
        screen: ROUTE_NAMES.PlannerSearch,
        params: {
          source: 'quick_action',
          returnTo: 'previous',
        },
      },
    });
  }, [navigation, searchEnabled, sheet]);

  const handleOpenSchedules = useCallback(() => {
    if (sheet.isSubmitting) return;
    sheet.requestClose('user_request');
    navigation.navigate('HomeTabs', {
      screen: 'PlannerTab',
      params: { screen: 'PlannerHome', params: { initialTab: 'plans', source: 'quick_action' } },
    });
  }, [navigation, sheet]);

  const handlers: Record<string, () => void> = {
    create_task: handleOpenTask,
    create_event: handleOpenEvent,
    create_goal: handleOpenGoal,
  };

  if (visibleActions.length === 0 && !searchVisible) {
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
    <View style={styles.container}>
      {searchVisible ? (
        <Pressable
          onPress={handleOpenSearch}
          disabled={!searchEnabled}
          style={({ pressed }) => [
            styles.searchBar,
            pressed && styles.searchBarPressed,
            !searchEnabled && styles.searchBarDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Buscar en HomePlus"
          accessibilityHint="Abre Search en pantalla completa"
          accessibilityState={{ disabled: !searchEnabled, busy: capabilitiesLoading }}
        >
          <HomePlusIcon
            name="search-outline"
            size={20}
            color={searchEnabled ? colors.text.secondary : colors.text.tertiary}
          />
          <AppText variant="body" tone={searchEnabled ? 'secondary' : 'tertiary'} style={styles.searchText}>
            {SEARCH_LABEL}
          </AppText>
        </Pressable>
      ) : null}

      <View style={styles.sectionTitle}>
        <AppText variant="bodySmall" weight="800" tone="secondary">
          {QUICK_ACTIONS_TITLE}
        </AppText>
      </View>

      <View style={styles.actionsGrid}>
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
                styles.actionCell,
                pressed && styles.actionCellPressed,
                isDisabled && styles.actionCellDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={action.accessibilityLabel}
              accessibilityState={{
                disabled: isDisabled,
                busy: sheet.isSubmitting,
              }}
            >
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

              <AppText
                variant="bodySmall"
                weight="800"
                tone={isDisabled ? 'tertiary' : 'primary'}
                align="center"
                style={styles.actionLabel}
              >
                {action.label}
              </AppText>
            </Pressable>
          );
        })}
        <Pressable
          onPress={handleOpenSchedules}
          disabled={sheet.isSubmitting}
          style={({ pressed }) => [styles.actionCell, pressed && styles.actionCellPressed, sheet.isSubmitting && styles.actionCellDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Cargar horario"
          accessibilityHint="Abre Horarios para crear o editar una rutina semanal"
          accessibilityState={{ disabled: sheet.isSubmitting, busy: sheet.isSubmitting }}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.sand[100] }]}>
            <HomePlusIcon name="time-outline" size={22} color={colors.sand[600]} />
          </View>
          <AppText variant="bodySmall" weight="800" align="center" style={styles.actionLabel}>Cargar horario</AppText>
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles (consistent with HomePlus design tokens, no emojis, no gradients)
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  emptyContainer: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[8],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  searchBarPressed: {
    backgroundColor: colors.surface.card,
    borderColor: colors.terracotta[300],
  },
  searchBarDisabled: {
    opacity: 0.58,
  },
  searchText: {
    marginLeft: spacing[2],
    flex: 1,
  },
  sectionTitle: {
    marginTop: spacing[5],
    marginBottom: spacing[3],
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  actionCell: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 92,
    minWidth: 96,
    flexBasis: '31%',
    flexGrow: 1,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
  },
  actionCellPressed: {
    backgroundColor: colors.surface.soft,
  },
  actionCellDisabled: {
    opacity: 0.58,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconDisabled: {
    opacity: 0.5,
  },
  actionLabel: {
    marginTop: spacing[2],
  },
});
