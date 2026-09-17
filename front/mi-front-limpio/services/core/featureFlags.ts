import { requestJson } from '../api';
import {
  featureFlagStore,
  type HomePlusFeatureFlags,
} from './featureFlagStore';

export { featureFlagStore, isFeatureEnabled, type HomePlusFeatureFlags } from './featureFlagStore';

type ProjectionResponse = { flags?: Record<string, unknown> };

function normalizeProjection(input: Record<string, unknown> | undefined): HomePlusFeatureFlags {
  const flags: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    if (typeof value === 'boolean') flags[key] = value;
  }
  return Object.freeze(flags);
}

export async function fetchFeatureFlagProjection(
  accessToken: string,
  accountId: string,
  householdId: string | null,
  signal?: AbortSignal,
): Promise<HomePlusFeatureFlags> {
  try {
    const response = await requestJson<ProjectionResponse>('/api/feature-flags', {
      accessToken,
      operationKind: 'READ_ONLY',
      signal,
      timeoutMs: 10_000,
    });
    const flags = normalizeProjection(response.flags);
    featureFlagStore.set(accountId, householdId, flags);
    return flags;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    const safeDefaults = Object.freeze({});
    featureFlagStore.set(accountId, householdId, safeDefaults);
    return safeDefaults;
  }
}
