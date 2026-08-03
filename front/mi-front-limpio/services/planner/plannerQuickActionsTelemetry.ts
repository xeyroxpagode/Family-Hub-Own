/**
 * Planner V1 — M4 Quick Actions Telemetry (frontend).
 *
 * Purpose:
 * - Minimal, approved telemetry for Quick Actions events.
 * - Delegates to backend tracking endpoint when available.
 * - Falls back to dev-only console in __DEV__.
 * - Strictly respects privacy contract (no PII, no payload, no title/description).
 *
 * Permitted events:
 * - planner_quick_actions_opened
 * - planner_quick_action_selected
 * - planner_quick_action_submit_succeeded
 * - planner_quick_action_submit_failed
 *
 * Permitted properties:
 * - action_type: 'task' | 'event'
 * - source: string
 * - error_code: string (only for failed)
 */

import { requestJson } from '../api';

type QuickActionType = 'task' | 'event' | 'goal';

let telemetryEndpoint: string | null = null;

function getEndpoint(): string | null {
  if (telemetryEndpoint !== null) return telemetryEndpoint;
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl) {
    telemetryEndpoint = '';
    return '';
  }
  // Use relative path - requestJson prepends base URL via buildApiUrl
  telemetryEndpoint = '/api/telemetry/event';
  return telemetryEndpoint;
}

async function sendEvent(
  name: string,
  properties: Record<string, string>,
  accessToken?: string | null,
): Promise<void> {
  const endpoint = getEndpoint();
  if (!endpoint) return;

  try {
    await requestJson(endpoint, {
      method: 'POST',
      accessToken,
      body: { name, properties },
      timeoutMs: 3000,
    });
  } catch {
    // Telemetry failure is never surfaced to the user.
    if (__DEV__) {
      console.debug('[PlannerTelemetry]', name, properties);
    }
  }
}

function devLog(event: string, data: Record<string, unknown>) {
  if (__DEV__) {
    console.debug(`[PlannerQuickActions] ${event}`, JSON.stringify(data));
  }
}

export const plannerQuickActionsTelemetry = {
  opened(accessToken?: string | null) {
    devLog('opened', {});
    void sendEvent('planner_quick_actions_opened', { source: 'center_tab_button' }, accessToken);
  },

  selected(actionType: QuickActionType, accessToken?: string | null) {
    devLog('selected', { action_type: actionType });
    void sendEvent('planner_quick_action_selected', {
      action_type: actionType,
      source: 'quick_actions_menu',
    }, accessToken);
  },

  submitSucceeded(actionType: QuickActionType, accessToken?: string | null) {
    devLog('submit_succeeded', { action_type: actionType });
    void sendEvent('planner_quick_action_submit_succeeded', {
      action_type: actionType,
      source: 'quick_actions_menu',
    }, accessToken);
  },

  submitFailed(actionType: QuickActionType, errorCode: string, accessToken?: string | null) {
    devLog('submit_failed', { action_type: actionType, error_code: errorCode });
    void sendEvent('planner_quick_action_submit_failed', {
      action_type: actionType,
      source: 'quick_actions_menu',
      error_code: errorCode,
    }, accessToken);
  },
} as const;