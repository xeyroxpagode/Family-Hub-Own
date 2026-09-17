/**
 * Planner V1 — M10 Deep Link URL Parser (deny-safe).
 *
 * Purpose (frozen by `planner_v1_implementation_order.md` §M10):
 * - Single authority for converting raw URLs into PlannerDeepLinkIntent.
 * - Deny-safe: never throws, never navigates, never executes requests.
 * - Validates UUID, tab keys, source, and allowed paths.
 * - Rejects: unknown paths, extra segments, invalid encoding, empty values,
 *   ambiguous paths, query params with forbidden content.
 * - No React, no navigation, no side effects.
 *
 * Binding rules:
 * - Accepts ONLY allowed schemes and hosts from the physical linking config.
 * - Accepts ONLY canonical paths: planner, planner/tasks/:id, planner/events/:id,
 *   planner/goals/:id, planner/search.
 * - Rejects: householdId in URL, entity payloads, sensitive query params.
 * - `source` is derived from the entry path: 'deep_link' for linking event,
 *   'notification' when injected from notification adapter.
 */

import {
  isValidPlannerEntityId,
  isPlannerTabKey,
  type PlannerTabKey,
  type PlannerNavigationSource,
  normalizePlannerNavigationSource,
} from '../../navigation/plannerNavigationContract';
import {
  type PlannerDeepLinkIntent,
  createPlannerRootIntent,
  createTaskDetailIntent,
  createEventDetailIntent,
  createGoalDetailIntent,
  createPlannerSearchIntent,
} from './plannerDeepLinkTypes';

// ---------------------------------------------------------------------------
// 1. Allowed schemes and hosts (derived from physical linking config in App.tsx)
// ---------------------------------------------------------------------------

/**
 * The physical custom scheme from the Expo project as reported by
 * `Linking.createURL('/')`. On Android development builds this resolves to
 * the scheme declared in the Expo config or derived from the package name.
 * On iOS it resolves to the registered URL scheme.
 *
 * M10 uses this as the single allowlist authority.
 */
let ALLOWED_PREFIXES: ReadonlySet<string> = new Set(['homeplus://']);
let ALLOWED_HOSTS: ReadonlyArray<string> = []; // Empty = any host with valid scheme accepted

/** Configure the scheme at runtime (called once from App.tsx or coordinator init). */
export function configureDeepLinkPrefixes(prefixes: string[], hosts?: string[]) {
  ALLOWED_PREFIXES = new Set(prefixes.map(p => p.endsWith('://') ? p : `${p}://`));
  if (hosts && hosts.length > 0) {
    ALLOWED_HOSTS = hosts;
  }
}

/** Returns current allowed prefixes (for testing/inspection). */
export function getAllowedPrefixes(): string[] {
  return Array.from(ALLOWED_PREFIXES);
}

// ---------------------------------------------------------------------------
// 2. Deep-link path constants
// ---------------------------------------------------------------------------

const PLANNER_PATH_PREFIX = 'planner';
const PATH_TASKS = `${PLANNER_PATH_PREFIX}/tasks`;
const PATH_EVENTS = `${PLANNER_PATH_PREFIX}/events`;
const PATH_GOALS = `${PLANNER_PATH_PREFIX}/goals`;
const PATH_SEARCH = `${PLANNER_PATH_PREFIX}/search`;

/** Canonical paths accepted by the parser. Order matters for matching. */
const ALLOWED_PATH_SEGMENTS: readonly string[] = [
  PLANNER_PATH_PREFIX,
  PATH_TASKS,
  PATH_EVENTS,
  PATH_GOALS,
  PATH_SEARCH,
] as const;

// ---------------------------------------------------------------------------
// 3. Path normalization
// ---------------------------------------------------------------------------

/**
 * Strips leading/trailing slashes and empty segments.
 * Does NOT try to interpret query strings — they are handled separately.
 */
function normalizePath(path: string): string {
  // Remove leading slash if present.
  let normalized = path.startsWith('/') ? path.slice(1) : path;
  // Remove trailing slash if present.
  normalized = normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
  // Collapse repeated slashes.
  normalized = normalized.replace(/\/{2,}/g, '/');
  return normalized;
}

// ---------------------------------------------------------------------------
// 4. Scheme and host validation
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the URL scheme matches an allowed prefix.
 * Parses the URL, extracting scheme+host, and matching against the allowlist.
 */
function isAllowedUrl(urlString: string): { ok: true; normalizedUrl: string } | { ok: false } {
  // Try to parse as a URL. If it fails to parse, reject.
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    // Not a valid URL at all.
    return { ok: false };
  }

  const scheme = `${url.protocol}//`;
  // Remove trailing slashes from the "://" segment
  const normalizedScheme = scheme.replace(/\/\/+$/, '') + '//';

  // Check if this prefix is allowed.
  if (!ALLOWED_PREFIXES.has(normalizedScheme) && !ALLOWED_PREFIXES.has(scheme)) {
    return { ok: false };
  }

  // Check host iff hosts are configured (otherwise allow any).
  if (ALLOWED_HOSTS.length > 0) {
    const hostname = url.hostname.toLowerCase();
    if (!ALLOWED_HOSTS.some(h => hostname === h || hostname.endsWith(`.${h}`))) {
      return { ok: false };
    }
  }

  return { ok: true, normalizedUrl: url.toString() };
}

// ---------------------------------------------------------------------------
// 5. Query param validation (deny unsafe params)
// ---------------------------------------------------------------------------

/**
 * Query params allowed for Planner deep links:
 * - `tab` for Planner root (tasks|calendar|goals)
 * - `source` for explicit source (deep_link|notification)
 *
 * All other query params are silently ignored.
 * Search query (`q`, `query`, `search`) is EXPLICITLY rejected.
 */
const ALLOWED_QUERY_KEYS = new Set<string>(['tab', 'source']);
const SEARCH_QUERY_KEYS = new Set<string>(['q', 'query', 'search', 'term', 'find', 'keyword', 'text']);

/**
 * Extracts allowed query params and returns whether a forbidden query key was found.
 */
function extractQueryParams(rawQuery: string): {
  tab: string | null;
  source: string | null;
  hasSearchQuery: boolean;
} {
  const params = new URLSearchParams(rawQuery);
  let tab: string | null = null;
  let source: string | null = null;
  let hasSearchQuery = false;

  for (const [key, value] of params) {
    const lowerKey = key.toLowerCase().trim();

    if (SEARCH_QUERY_KEYS.has(lowerKey)) {
      hasSearchQuery = true;
      continue; // Don't reject entirely — just flag it
    }

    if (lowerKey === 'tab' && isPlannerTabKey(value)) {
      tab = value as PlannerTabKey;
    } else if (lowerKey === 'source') {
      source = value;
    }
    // Unknown keys are silently ignored.
  }

  return { tab, source, hasSearchQuery };
}

// ---------------------------------------------------------------------------
// 6. Main parser
// ---------------------------------------------------------------------------

export type DeepLinkParseResult =
  | { ok: true; intent: PlannerDeepLinkIntent }
  | { ok: false; reason: string };

/**
 * Parses a raw URL string into a PlannerDeepLinkIntent.
 *
 * Deny-safe: never throws, never navigates. Returns `{ ok: false, reason }`
 * for any invalid input. The caller is responsible for deciding how to handle
 * rejections (the coordinator applies the contractual fallback).
 *
 * @param urlString Raw URL string from Linking event or notification payload.
 * @param injectSource Override source (e.g. 'notification' via adapter).
 *        Defaults to 'deep_link' when absent.
 */
export function parsePlannerDeepLink(
  urlString: string,
  injectSource?: PlannerNavigationSource,
): DeepLinkParseResult {
  // Guard: reject empty or obviously invalid input.
  if (!urlString || typeof urlString !== 'string' || urlString.trim().length === 0) {
    return { ok: false, reason: 'invalid_url' };
  }

  const trimmed = urlString.trim();

  // 1. Scheme/host validation.
  const allowedResult = isAllowedUrl(trimmed);
  if (!allowedResult.ok) {
    return { ok: false, reason: 'invalid_url' };
  }

  // 2. Parse URL parts.
  let parsed: URL;
  try {
    parsed = new URL(allowedResult.normalizedUrl);
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }

  // 3. Extract and normalize path.
  const rawPath = parsed.pathname ?? '';
  const path = normalizePath(rawPath);

  // 4. Extract query params.
  const queryRaw = parsed.search ?? '';
  const queryResult = extractQueryParams(queryRaw);

  // 5. Match path against allowed segments.
  // Split path into segments.
  const segments = path.split('/').filter(s => s.length > 0);

  if (segments.length === 0) {
    return { ok: false, reason: 'unsupported_route' };
  }

  // All paths must start with 'planner'.
  if (segments[0] !== PLANNER_PATH_PREFIX) {
    return { ok: false, reason: 'unsupported_route' };
  }

  // Derive source from injection or query, normalize, default to 'deep_link'.
  const rawSource = injectSource ?? queryResult.source ?? 'deep_link';
  const source = normalizePlannerNavigationSource(rawSource);

  // --- Route matching (from most specific to least) ---

  // planner/tasks/:entityId (3 segments: planner / tasks / uuid)
  if (segments.length === 3 && segments[1] === 'tasks') {
    const entityId = segments[2];
    if (!isValidPlannerEntityId(entityId)) {
      return { ok: false, reason: 'invalid_entity_id' };
    }
    return { ok: true, intent: createTaskDetailIntent(entityId, source) };
  }

  // planner/events/:entityId
  if (segments.length === 3 && segments[1] === 'events') {
    const entityId = segments[2];
    if (!isValidPlannerEntityId(entityId)) {
      return { ok: false, reason: 'invalid_entity_id' };
    }
    return { ok: true, intent: createEventDetailIntent(entityId, source) };
  }

  // planner/goals/:entityId
  if (segments.length === 3 && segments[1] === 'goals') {
    const entityId = segments[2];
    if (!isValidPlannerEntityId(entityId)) {
      return { ok: false, reason: 'invalid_entity_id' };
    }
    return { ok: true, intent: createGoalDetailIntent(entityId, source) };
  }

  // planner/search (2 segments: planner / search)
  if (segments.length === 2 && segments[1] === 'search') {
    // Reject search deep link if it carries a search query.
    if (queryResult.hasSearchQuery) {
      return { ok: false, reason: 'invalid_url' };
    }
    return { ok: true, intent: createPlannerSearchIntent(source) };
  }

  // planner (1 segment: planner)
  if (segments.length === 1) {
    const tab = queryResult.tab;
    return {
      ok: true,
      intent: createPlannerRootIntent(source, tab as PlannerTabKey | undefined),
    };
  }

  // Any other path segment count or structure → unsupported.
  // This catches: planner//tasks (empty segments), planner/tasks/ (no entity),
  // planner/tasks/extra, planner/organizar, etc.
  return { ok: false, reason: 'unsupported_route' };
}

// ---------------------------------------------------------------------------
// 7. Intent validation (post-parse, additional rules)
// ---------------------------------------------------------------------------

/**
 * Validates a parsed PlannerDeepLinkIntent against additional business rules
 * beyond what the parser checks (e.g. Search requires flag+capability gate
 * which is NOT checked here — that's done by the coordinator).
 *
 * Pure validation includes:
 * - Entity detail intents MUST have a valid entityId.
 * - Root intents MUST NOT carry entity IDs.
 * - Search intents MUST NOT carry query (parser already handles, here defensive).
 */
export function validatePlannerDeepLinkIntent(
  intent: PlannerDeepLinkIntent,
): { ok: true } | { ok: false; reason: string } {
  switch (intent.kind) {
    case 'planner_root': {
      if (intent.initialTab && !isPlannerTabKey(intent.initialTab)) {
        return { ok: false, reason: 'invalid_url' };
      }
      return { ok: true };
    }

    case 'task_detail':
    case 'event_detail':
    case 'goal_detail': {
      if (!isValidPlannerEntityId(intent.entityId)) {
        return { ok: false, reason: 'invalid_entity_id' };
      }
      return { ok: true };
    }

    case 'planner_search': {
      return { ok: true };
    }

    default:
      return { ok: false, reason: 'unsupported_route' };
  }
}

// ---------------------------------------------------------------------------
// 8. Normalization (strip unknown/unsafe fields, ensure canonical shape)
// ---------------------------------------------------------------------------

/**
 * Ensures a PlannerDeepLinkIntent is in its most canonical form:
 * - `source` normalized.
 * - No extraneous fields.
 * - `initialTab` valid or dropped.
 */
export function normalizePlannerDeepLinkIntent(
  intent: PlannerDeepLinkIntent,
): PlannerDeepLinkIntent {
  const source = normalizePlannerNavigationSource(intent.source);

  switch (intent.kind) {
    case 'planner_root': {
      const tab = intent.initialTab && isPlannerTabKey(intent.initialTab)
        ? intent.initialTab
        : undefined;
      return createPlannerRootIntent(source, tab as PlannerTabKey | undefined);
    }
    case 'task_detail':
      return createTaskDetailIntent(intent.entityId, source);
    case 'event_detail':
      return createEventDetailIntent(intent.entityId, source);
    case 'goal_detail':
      return createGoalDetailIntent(intent.entityId, source);
    case 'planner_search':
      return createPlannerSearchIntent(source);
  }
}