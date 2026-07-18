/**
 * Planner V1 — M10 Notification Deep Link Adapter.
 *
 * Purpose (frozen by `planner_v1_implementation_order.md` §M10):
 * - Single authoritative adapter for converting notification payloads
 *   into PlannerDeepLinkIntent.
 * - Handles cold-start (initial notification) and warm (listener) paths.
 * - Deduplicates against coordinator fingerprint.
 * - Allowlists only known Planner notification kinds.
 * - Never executes arbitrary URLs from payload.
 *
 * Binding rules:
 * - Does NOT implement push transport (FCM/APNS/expo-notifications).
 * - Does NOT handle permission prompts.
 * - Does NOT replace Coordinator — feeds Coordinator.receiveIntent.
 * - Payload must contain allowlisted fields only.
 *
 * Transport status:
 *   Push notification transport (FCM/APNS/expo-notifications): NOT PRESENT IN CURRENT APP
 *   Initial/warm native delivery: NOT EXECUTED
 *   Adapter contract: IMPLEMENTED
 */

import { Platform } from 'react-native';
import type { PlannerDeepLinkIntent, PlannerNavigationSource } from '../planner/plannerDeepLinkTypes';
import {
  createPlannerRootIntent,
  createTaskDetailIntent,
  createEventDetailIntent,
  createGoalDetailIntent,
  createPlannerSearchIntent,
} from '../planner/plannerDeepLinkTypes';
import { isValidPlannerEntityId } from '../../navigation/plannerNavigationContract';

// ---------------------------------------------------------------------------
// 1. Allowlisted notification payload schema
// ---------------------------------------------------------------------------

/**
 * Notification payload allowlist — ONLY these kinds are accepted.
 * Any other kind is rejected at parse time.
 */
export type PlannerNotificationKind =
  | 'task_detail'
  | 'event_detail'
  | 'goal_detail'
  | 'planner_root'
  | 'planner_search';

/**
 * Validated, allowlisted notification payload.
 * Contains ONLY fields needed to construct a PlannerDeepLinkIntent.
 */
export type ValidatedNotificationPayload = {
  /** The Planner deep-link kind (maps to intent kind). */
  kind: PlannerNotificationKind;
  /** UUID of the target entity (required for detail kinds). */
  entityId?: string;
  /** Optional tab hint for planner_root. */
  initialTab?: 'tasks' | 'calendar' | 'goals';
  /** Optional metadata for analytics (never used for auth/access). */
  meta?: Record<string, string>;
};

/**
 * Raw notification payload as received from push/FCM/APNS.
 * May contain arbitrary fields — we validate against allowlist.
 */
export type RawNotificationPayload = Record<string, unknown>;

// ---------------------------------------------------------------------------
// 2. Payload validation (deny-safe)
// ---------------------------------------------------------------------------

const ALLOWED_KINDS: readonly PlannerNotificationKind[] = [
  'task_detail',
  'event_detail',
  'goal_detail',
  'planner_root',
  'planner_search',
] as const;

const ALLOWED_TABS = ['tasks', 'calendar', 'goals'] as const;
const ALLOWED_META_KEYS = ['source', 'campaign_id', 'timestamp'] as const;

/**
 * Validates a raw notification payload against the allowlist.
 * Returns validated payload or null if invalid.
 * Never throws — invalid payloads are silently rejected.
 */
export function validateNotificationPayload(payload: RawNotificationPayload): ValidatedNotificationPayload | null {
  // Must be a plain object
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  // Kind is required and must be allowlisted
  const kind = payload.kind;
  if (typeof kind !== 'string' || !ALLOWED_KINDS.includes(kind as PlannerNotificationKind)) {
    return null;
  }

  const validated: ValidatedNotificationPayload = { kind: kind as PlannerNotificationKind };

  // Entity ID validation for detail kinds
  if (kind === 'task_detail' || kind === 'event_detail' || kind === 'goal_detail') {
    const entityId = payload.entityId;
    if (typeof entityId !== 'string' || !isValidPlannerEntityId(entityId)) {
      return null; // Missing or invalid UUID
    }
    validated.entityId = entityId;
  }

  // Optional initialTab for planner_root
  if (kind === 'planner_root') {
    const initialTab = payload.initialTab;
    if (typeof initialTab === 'string' && (initialTab === 'tasks' || initialTab === 'calendar' || initialTab === 'goals')) {
      validated.initialTab = initialTab as 'tasks' | 'calendar' | 'goals';
    }
  }

  // Optional meta (allowlisted keys only)
  if (payload.meta && typeof payload.meta === 'object' && !Array.isArray(payload.meta)) {
    const meta: Record<string, string> = {};
    for (const [key, value] of Object.entries(payload.meta as Record<string, unknown>)) {
      if (['source', 'campaign_id', 'timestamp'].includes(key) && typeof value === 'string') {
        meta[key] = value;
      }
    }
    if (Object.keys(meta).length > 0) {
      validated.meta = meta;
    }
  }

  return validated;
}

// ---------------------------------------------------------------------------
// 3. Payload → Intent factory
// ---------------------------------------------------------------------------

/**
 * Converts a validated notification payload into a PlannerDeepLinkIntent.
 * Source is always 'notification'.
 */
export function notificationPayloadToIntent(payload: ValidatedNotificationPayload): PlannerDeepLinkIntent {
  const source: PlannerNavigationSource = 'notification';

  switch (payload.kind) {
    case 'task_detail':
      return createTaskDetailIntent(payload.entityId!, source);
    case 'event_detail':
      return createEventDetailIntent(payload.entityId!, source);
    case 'goal_detail':
      return createGoalDetailIntent(payload.entityId!, source);
    case 'planner_root':
      return createPlannerRootIntent(source, payload.initialTab);
    case 'planner_search':
      return createPlannerSearchIntent(source);
    default:
      // Exhaustive check — should never reach here due to validation
      return createPlannerRootIntent(source);
  }
}

// ---------------------------------------------------------------------------
// 4. Notification adapter — lifecycle integration
// ---------------------------------------------------------------------------

/**
 * Result of notification processing.
 */
export type NotificationAdapterResult =
  | { status: 'navigated'; intent: PlannerDeepLinkIntent }
  | { status: 'deferred'; intent: PlannerDeepLinkIntent }
  | { status: 'rejected'; reason: string }
  | { status: 'duplicate'; fingerprint: string };

/**
 * Notification adapter state for deduplication.
 * Keeps fingerprint of recently processed notifications.
 */
interface NotificationAdapterState {
  recentFingerprints: Array<{ fingerprint: string; timestamp: number }>;
}

/**
 * Minimal Notifications API surface for optional transport layer.
 * This is a no-op implementation that allows the adapter to work
 * without expo-notifications installed. The transport layer
 * (FCM/APNS/expo-notifications) is NOT implemented in this app.
 */
const NoopNotifications = {
  getLastNotificationResponseAsync: async () => null,
  addNotificationResponseReceivedListener: (_listener: (response: any) => void) => ({
    remove: () => {},
  }),
  setNotificationHandler: (_handler: any) => {},
};

const Notifications = NoopNotifications;

// ---------------------------------------------------------------------------
// 4.1 Fingerprint helpers
// ---------------------------------------------------------------------------

/**
 * Creates a fingerprint for deduplication.
 * Must match coordinator's fingerprint logic.
 */
function createFingerprint(intent: PlannerDeepLinkIntent): string {
  const entityId = intent.kind === 'task_detail' || intent.kind === 'event_detail' || intent.kind === 'goal_detail'
    ? intent.entityId
    : null;
  return `${intent.kind}|${entityId ?? ''}|${intent.source}`;
}

/**
 * Checks if fingerprint was recently processed.
 */
function isDuplicate(state: { recentFingerprints: Array<{ fingerprint: string; timestamp: number }> }, fingerprint: string, dedupWindowMs: number): boolean {
  const now = Date.now();
  // Clean old entries
  state.recentFingerprints = state.recentFingerprints.filter(f => now - f.timestamp < dedupWindowMs);
  return state.recentFingerprints.some(f => f.fingerprint === fingerprint);
}

/**
 * Records a fingerprint as processed.
 */
function recordFingerprint(state: { recentFingerprints: Array<{ fingerprint: string; timestamp: number }> }, fingerprint: string): void {
  state.recentFingerprints.push({ fingerprint, timestamp: Date.now() });
}

// ---------------------------------------------------------------------------
// 4.2 Notification adapter factory
// ---------------------------------------------------------------------------

/**
 * Creates a notification adapter that bridges notification transport
 * (or test fixtures) to the PlannerDeepLinkCoordinator.
 *
 * Responsibilities:
 * - Subscribe to notification responses (cold + warm)
 * - Validate payload against allowlist
 * - Convert to PlannerDeepLinkIntent
 * - Deduplicate against coordinator + local window
 * - Feed Coordinator via receiveIntent()
 *
 * Usage:
 *   const adapter = createNotificationAdapter(coordinator);
 *   adapter.start();
 *   // On unmount:
 *   adapter.stop();
 */
export function createNotificationAdapter(
  getCoordinator: () => { receiveIntent: (intent: PlannerDeepLinkIntent) => any } | null
) {
  const state: { recentFingerprints: Array<{ fingerprint: string; timestamp: number }> } = { recentFingerprints: [] };
  let listener: { remove: () => void } | null = null;
  let initialHandled = false;

  const DEDUP_WINDOW_MS = 5000; // 5 seconds for notification dedup

  /**
   * Creates a fingerprint for deduplication.
   * Must match coordinator's fingerprint logic.
   */
  function createFingerprintLocal(intent: PlannerDeepLinkIntent): string {
    const entityId = intent.kind === 'task_detail' || intent.kind === 'event_detail' || intent.kind === 'goal_detail'
      ? intent.entityId
      : null;
    return `${intent.kind}|${entityId ?? ''}|${intent.source}`;
  }

  /**
   * Processes a validated notification payload into an intent
   * and feeds it to the coordinator.
   */
  async function processValidatedPayload(validated: ValidatedNotificationPayload): Promise<NotificationAdapterResult> {
    const coordinator = getCoordinator();
    if (!coordinator) {
      return { status: 'rejected', reason: 'coordinator_not_ready' };
    }

    const intent = notificationPayloadToIntent(validated);
    const fingerprint = createFingerprintLocal(intent);

    // Local dedup check (fast path)
    if (isDuplicate(state, fingerprint, DEDUP_WINDOW_MS)) {
      return { status: 'duplicate', fingerprint };
    }

    // Feed to coordinator (handles its own dedup + readiness)
    const result = coordinator.receiveIntent(intent);

    if (result.outcome === 'navigated') {
      recordFingerprint(state, fingerprint);
      return { status: 'navigated', intent };
    }
    if (result.outcome === 'deferred') {
      return { status: 'deferred', intent };
    }
    if (result.outcome === 'duplicate') {
      return { status: 'duplicate', fingerprint };
    }
    return { status: 'rejected', reason: result.reason };
  }

  /**
   * Handles a raw notification response (from listener or initial).
   */
  async function handleNotificationResponse(response: any): Promise<NotificationAdapterResult> {
    const payload = response?.notification?.request?.content?.data as RawNotificationPayload | undefined;
    if (!payload) {
      return { status: 'rejected', reason: 'no_payload' };
    }

    const validated = validateNotificationPayload(payload);
    if (!validated) {
      return { status: 'rejected', reason: 'invalid_payload' };
    }

    return processValidatedPayload(validated);
  }

  /**
   * Starts listening for notifications.
   * Call once on app mount (inside PlannerDeepLinkProvider or root).
   */
  function start(): void {
    if (listener) return; // Already started

    // Handle initial notification (cold start)
    if (!initialHandled) {
      initialHandled = true;
      // No-op in noop mode — real transport would call getLastNotificationResponseAsync
    }

    // Subscribe to notification responses (warm) — noop in noop mode
    listener = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
  }

  /**
   * Stops listening. Call on unmount.
   */
  function stop(): void {
    if (listener) {
      listener.remove();
      listener = null;
    }
    state.recentFingerprints = [];
  }

  // Configure notification handler for foreground presentation (noop)
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  return {
    start,
    stop,
    handleNotificationResponse,
    processValidatedPayload,
    validateNotificationPayload,
    notificationPayloadToIntent,
  };
}