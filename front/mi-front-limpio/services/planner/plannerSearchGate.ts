/**
 * Planner V1 — Search entry guard.
 *
 * CURRENT TRUTH (overnight closure): Planner Search is a REQUIRED V1 capability
 * (backend route + canonical reader + registered screen all exist). The entry is
 * therefore governed by the canonical `planner.search` capability ALONE.
 *
 * The `planner.search_entry` flag key stays registered because HomePlus Core
 * owns the flag registry and the persisted override allowlist, but it no longer
 * gates this REQUIRED entry: an off-by-default gate would make a live feature
 * UNREACHABLE, which frozen §41 classifies as not-PASS.
 *
 * Authority rules preserved:
 * - NO second authority (capability matrix is the only gate).
 * - Deny-safe: missing/error capability projection → closed.
 * - Unexpected navigation while closed → safe fallback, never an error.
 *
 * For loading/disabled/forbidden/available discrimination use
 * `resolvePlannerSearchAccess` (plannerSearchAccess.ts), which is the ONLY
 * authority for this entry. A hook-returning `boolean` was removed on purpose:
 * it would be a second authority and could silently disagree with the resolver.
 */

import { isFeatureEnabled } from '../core/featureFlagStore';
import type { HomePlusFeatureFlags } from '../core/featureFlagStore';

export const PLANNER_SEARCH_FLAG_KEY = 'planner.search_entry' as const;
export const PLANNER_SEARCH_CAPABILITY = 'planner.search' as const;

/**
 * Check if Planner Search entry point is open for the current
 * account + household context.
 *
 * Authority: the canonical `planner.search` capability. The reserved
 * `planner.search_entry` flag is NOT part of this decision (see file header).
 * Deny-safe: a missing/undefined capability projection closes the entry.
 */
export function canOpenPlannerSearch(
  flags: HomePlusFeatureFlags | null | undefined,
  capabilities?: Record<string, boolean> | null | undefined,
): boolean {
  void flags;
  return capabilities?.[PLANNER_SEARCH_CAPABILITY] === true;
}

/**
 * Raw reserved flag value (diagnostics/telemetry only). It does NOT gate the
 * Search entry; see the file header.
 */
export function getPlannerSearchFlag(flags: HomePlusFeatureFlags | null | undefined): boolean {
  return isFeatureEnabled(flags, PLANNER_SEARCH_FLAG_KEY);
}

/**
 * Safe fallback action when navigation to Search is attempted but the
 * gate is closed. Does NOT throw; logs a warning in DEV and returns
 * the caller to the Planner root.
 */
export function plannerSearchFallbackAction(
  flags: HomePlusFeatureFlags | null | undefined,
  capabilities?: Record<string, boolean> | null | undefined,
): { allowed: boolean; reason: 'flag_off' | 'capability_missing' | 'both' | 'unknown' } {
  void flags;
  const capOn = capabilities?.[PLANNER_SEARCH_CAPABILITY] === true;
  if (capOn) return { allowed: true, reason: 'unknown' };
  return { allowed: false, reason: 'capability_missing' };
}