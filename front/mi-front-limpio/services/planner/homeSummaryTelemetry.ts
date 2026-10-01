/**
 * Planner V1 — M9 Home Summary Telemetry (frontend).
 *
 * Minimal, privacy-respecting telemetry for Home Summary events, mirroring
 * `plannerQuickActionsTelemetry` patterns and the M8 backend catalog.
 *
 * Permitted events:
 *   - planner_home_summary_loaded
 *   - planner_home_summary_partial
 *   - planner_home_task_completion_started
 *   - planner_home_task_completion_succeeded
 *   - planner_home_task_completion_failed
 *
 * Permitted properties (allowlisted; unknown props are never sent):
 *   - source: always 'home'
 *   - result: 'success' | 'partial' | 'failure'
 *   - error_code: short stable code (failed only)
 *   - section: 'tasks' | 'events' | 'goals' (partial only)
 *   - latency_bucket: '<100ms' | '100-300ms' | '300ms-1s' | '>1s'
 *
 * Privacy contract:
 *   - NO Task ID, title, description, assigned member, household, actor
 *   - NO version, no payload, no request headers, no stack
 *   - NO exact counts, only buckets
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

const latencyBucket = (ms: number): string => {
  if (ms < 100) return '<100ms';
  if (ms < 300) return '100-300ms';
  if (ms < 1000) return '300ms-1s';
  return '>1s';
};

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
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.debug('[HomeSummaryTelemetry]', name, properties);
    }
  }
}

function devLog(event: string, data: Record<string, unknown>) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.debug(`[HomeSummary] ${event}`, JSON.stringify(data));
  }
}

export const homeSummaryTelemetry = {
  loaded(latencyMs: number, hasPartial: boolean, accessToken?: string | null) {
    const result = hasPartial ? 'partial' : 'success';
    devLog('loaded', { result, latency_ms: latencyMs });
    void sendEvent(
      'planner_home_summary_loaded',
      {
        source: 'home',
        result,
        latency_bucket: latencyBucket(latencyMs),
      },
      accessToken,
    );
  },

  partial(
    sections: readonly ('tasks' | 'events' | 'goals')[],
    latencyMs: number,
    accessToken?: string | null,
  ) {
    devLog('partial', { sections: sections.join(','), latency_ms: latencyMs });
    // The backend telemetry already emits planner_summary_partial; this is a
    // frontend-side mirror that records the same signal from the consumer's
    // perspective so future drift between client/server observability is
    // detectable. Keep the event name aligned with the spec.
    void sendEvent(
      'planner_home_summary_partial',
      {
        source: 'home',
        result: 'partial',
        section: sections.join(','),
        latency_bucket: latencyBucket(latencyMs),
      },
      accessToken,
    );
  },

  completionStarted(accessToken?: string | null) {
    devLog('completion_started', {});
    void sendEvent(
      'planner_home_task_completion_started',
      { source: 'home' },
      accessToken,
    );
  },

  completionSucceeded(latencyMs: number, accessToken?: string | null) {
    devLog('completion_succeeded', { latency_ms: latencyMs });
    void sendEvent(
      'planner_home_task_completion_succeeded',
      {
        source: 'home',
        result: 'success',
        latency_bucket: latencyBucket(latencyMs),
      },
      accessToken,
    );
  },

  completionFailed(errorCode: string, accessToken?: string | null) {
    devLog('completion_failed', { error_code: errorCode });
    void sendEvent(
      'planner_home_task_completion_failed',
      {
        source: 'home',
        result: 'failure',
        error_code: errorCode,
      },
      accessToken,
    );
  },
} as const;
