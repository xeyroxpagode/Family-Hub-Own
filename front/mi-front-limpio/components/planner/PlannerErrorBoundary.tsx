/**
 * Planner V1 — M2 PlannerErrorBoundary.
 *
 * Purpose (frozen by `planner_v1_implementation_order.md` §M2):
 * - Single React error boundary dedicated to Planner shell render failures.
 * - Prevents white screens; provides an accessible fallback with retry and a
 *   safe exit.
 * - Generates a redacted, opaque incident id (no stack, no PII, no household
 *   id, no tokens).
 * - Integrates with the global telemetry catalog using permitted event names
 *   only — but does NOT emit raw errors, titles, names, payloads, or
 *   stack traces. The fallback is silent when no telemetry is available (it
 *   is a UI module; emission happens via the registered sink only).
 *
 * Binding rules:
 * - Catches ONLY render errors of the Planner subtree. It must NOT catch
 *   ordinary network errors (those flow through the typed shell state and
 *   classified `PlannerError`).
 * - Restores internal state on retry (resets `key` to force a fresh mount).
 * - Allows the user to leave Planner via the safe-exit callback.
 * - Does not create a global app error boundary.
 * - Does not install dependencies.
 *
 * Out of scope for M2:
 * - Boundary telemetry emission wiring (registered via the planner telemetry
 *   catalog in a separate micro-position once the catalog allows the event).
 *   The component emits nothing by default to honor strict content policy.
 */

import React, { Component, type ReactNode } from 'react';
import { View } from 'react-native';

import { colors, radius, spacing, touchTargets } from '../../constants/theme';
import { APP_ICONS, HomePlusIcon } from '../../constants/icons';
import { AppButton } from '../ui/AppButton';
import { AppText } from '../ui/AppText';
import { generatePlannerIncidentId } from '../../services/planner/plannerShellState';

// ---------------------------------------------------------------------------
// 1. Telemetry hook (optional, side-effect free by default)
// ---------------------------------------------------------------------------

/**
 * Optional telemetry callback. The shell registers it once when the global
 * telemetry catalog is composed. When omitted (or when the catalog is a
 * no-op sink), the boundary emits nothing — strict content policy still
 * holds because we never pass raw errors, titles, names, or stacks to it.
 *
 * Properties allowed by the privacy contract: `event_name`,
 * `reason_kind` (one of `'render'`), and an opaque `incident_id`. Nothing
 * else is emitted by this boundary.
 */
export type PlannerErrorBoundaryTelemetry = (
  eventName: 'planner_shell_failed',
  properties: {
    readonly reason_kind: 'render';
    readonly incident_id: string;
  },
) => void;

// ---------------------------------------------------------------------------
// 2. Incident state
// ---------------------------------------------------------------------------

type PlannerErrorBoundaryState =
  | { readonly mode: 'mounting' }
  | {
      readonly mode: 'failure';
      readonly incidentId: string;
      readonly attempt: number;
    };

// ---------------------------------------------------------------------------
// 3. PlannerErrorBoundary component
// ---------------------------------------------------------------------------

export type PlannerErrorBoundaryProps = {
  children: ReactNode;
  /**
   * Notify when the boundary captures a render failure. Receives a sanitized
   * description only (`{ incidentId }`). The original error is NEVER passed
   * to the consumer of this boundary as a visible prop, ensuring no stack
   * reaches UI chrome.
   */
  onFailure?: (info: { incidentId: string }) => void;
  /**
   * Optional telemetry hook. See `PlannerErrorBoundaryTelemetry`.
   */
  onTelemetry?: PlannerErrorBoundaryTelemetry;
  /**
   * Label/accessibility role hint used by the fallback action.
   */
  exitLabel?: string;
  /**
   * Safe-exit callback invoked when the user taps the leave action. The
   * screen owner is responsible for navigating to a safe destination
   * (typically the Home tab). When omitted, the leave action is hidden and
   * only retry remains.
   */
  onExit?: () => void;
  /**
   * Optional retry override, used in tests. Default retries by advancing
   * the internal attempt counter which remounts the child subtree.
   */
  onRetry?: (info: { incidentId: string }) => void;
};

export class PlannerErrorBoundary extends Component<
  PlannerErrorBoundaryProps,
  PlannerErrorBoundaryState
> {
  state: PlannerErrorBoundaryState = { mode: 'mounting' };

  static getDerivedStateFromError(): PlannerErrorBoundaryState {
    return {
      mode: 'failure',
      incidentId: generatePlannerIncidentId(),
      attempt: Date.now(),
    };
  }

  componentDidCatch(error: unknown): void {
    // Fire-and-forget side channel only. We MUST NOT bubble the error object
    // into UI or telemetry. `onFailure` exposes only the incident id; raw
    // error inspection happens in development tooling, never in UI chrome.
    if (this.props.onFailure) {
      const state = this.state;
      if (state.mode === 'failure') {
        this.props.onFailure({ incidentId: state.incidentId });
      }
    }
    if (this.props.onTelemetry && this.state.mode === 'failure') {
      try {
        this.props.onTelemetry('planner_shell_failed', {
          reason_kind: 'render',
          incident_id: this.state.incidentId,
        });
      } catch {
        // Telemetry sink failures never degrade product UX.
      }
    }
    // Suppressed unused warning in lints:
    void error;
  }

  private handleRetry = (): void => {
    if (this.props.onRetry && this.state.mode === 'failure') {
      this.props.onRetry({ incidentId: this.state.incidentId });
    }
    // Force fresh mount of the child subtree (drops stale internal state).
    this.setState({ mode: 'mounting' });
  };

  private handleExit = (): void => {
    const { onExit } = this.props;
    if (onExit) onExit();
  };

  render(): ReactNode {
    const { children } = this.props;
    const { mode } = this.state;

    if (mode === 'mounting') {
      return children;
    }

    return (
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
        importantForAccessibility="auto"
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing[6],
          gap: spacing[4],
          backgroundColor: colors.background.base,
        }}
      >
        <View
          style={{
            minHeight: touchTargets.fab,
            minWidth: touchTargets.fab,
            borderRadius: radius.xxl,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.danger.soft,
          }}
        >
          <HomePlusIcon name={APP_ICONS.planner.notes ?? 'warning'} size={28} color={colors.danger.text} />
        </View>
        <View style={{ gap: spacing[2], alignItems: 'center' }}>
          <AppText variant="title3" align="center" tone="primary">
            Planner no está disponible
          </AppText>
          <AppText variant="bodySmall" align="center" tone="secondary">
            Algo falló al cargar Planner. Podés reintentar o volver a un área segura.
          </AppText>
          {this.state.mode === 'failure' ? (
            <AppText variant="caption" align="center" tone="tertiary">
              Incidente {this.state.incidentId}
            </AppText>
          ) : null}
        </View>
        <View style={{ gap: spacing[2], alignItems: 'stretch', minWidth: 220 }}>
          <AppButton
            title="Reintentar"
            variant="primary"
            onPress={this.handleRetry}
            accessibilityLabel="Reintentar cargar Planner"
          />
          {this.props.onExit ? (
            <AppButton
              title={this.props.exitLabel ?? 'Salir de Planner'}
              variant="ghost"
              onPress={this.handleExit}
              accessibilityLabel={this.props.exitLabel ?? 'Salir de Planner'}
            />
          ) : null}
        </View>
      </View>
    );
  }
}
