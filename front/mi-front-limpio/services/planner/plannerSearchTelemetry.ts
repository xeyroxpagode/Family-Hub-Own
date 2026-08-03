/**
 * Planner V1 — M7 Search Telemetry.
 *
 * Purpose (frozen by `planner_v1_implementation_order.md` §M7):
 * - Minimal, approved telemetry for the Planner Search entry point.
 * - Only emits `planner_search_opened` when the entry was actually available
 *   and navigation was accepted.
 * - Delegates to the same backend tracking endpoint as Quick Actions telemetry.
 * - Falls back to dev-only console in __DEV__.
 * - Strictly respects privacy contract: no query, no titles, no IDs, no PII.
 *
 * Permitted events:
 *   - planner_search_opened
 *
 * Permitted properties:
 *   - source: 'planner' | 'unknown'
 *   - entry_type: 'screen'
 *
 * NOT permitted:
 *   - query, title, description, entity ID, household ID, account ID,
 *     capability projection, flag metadata, tokens.
 */

import { requestJson } from '../api';

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
  timeoutMs = 3000,
): Promise<void> {
  const endpoint = getEndpoint();
  if (!endpoint) return;

  try {
    await requestJson(endpoint, {
      method: 'POST',
      // No accessToken explicitly — telemetry endpoint uses the session from
      // the provider context if available, or falls back to anonymous.
      body: { name, properties },
      timeoutMs,
    });
  } catch {
    if (__DEV__) {
      console.debug('[PlannerSearchTelemetry]', name, properties);
    }
  }
}

function devLog(event: string, data: Record<string, unknown>) {
  if (__DEV__) {
    console.debug(`[PlannerSearch] ${event}`, JSON.stringify(data));
  }
}

export const plannerSearchTelemetry = {
  /**
   * Emitted only when:
   * - The entry point was available (flag + capability both true).
   * - Navigation to PlannerSearch was accepted.
   * - The screen rendered.
   *
   * Properties:
   * - `source`: the entry source ('planner' or 'unknown').
   * - `entry_type`: 'screen'.
   *
   * NOT emitted when:
   * - Flag is disabled.
   * - Capability is forbidden.
   * - Deep link was rejected.
   * - Render was incidental.
   */
  opened(params: { source: string; entry_type: string }) {
    devLog('opened', params);
    void sendEvent('planner_search_opened', {
      source: params.source,
      entry_type: params.entry_type,
    });
  },
} as const;