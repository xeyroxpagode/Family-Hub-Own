/**
 * HomeCloud V1 — Capabilities Projection Adapter.
 *
 * Purpose:
 * - Single typed authority for checking HomeCloud capabilities against the
 *   cached projection (`fetchHomeCloudCapabilitiesCached`).
 * - One helper per real action — NO role-based logic, NO aliasing.
 * - Deny-safe: missing/invalid projection returns `false`.
 * - Backend ALWAYS re-verifies; frontend only hides/disables.
 *
 * Binding rules (frozen by HC-1D):
 * - Each HomeCloud action maps to exactly one capability.
 * - Unknown capability key → deny.
 * - Projection errors (abort/timeout) → deny (safe default).
 *
 * Out of scope for HC-1D:
 * - HomeCloud UI screens (future slices).
 * - Capability fetch logic (core already implemented).
 */

import type { HomeCloudCapability, HomeCloudCapabilitiesProjection } from '../homecloudCapabilities';

// Re-export the capability type and projection shape so unit tests and
// downstream consumers can compose their projections without importing the
// raw service module. No parallel engine created here: this is purely a
// passive alias for ergonomics and refactor protection.
export type { HomeCloudCapability, HomeCloudCapabilitiesProjection } from '../homecloudCapabilities';
export { HOMECLOUD_CAPABILITIES } from '../homecloudCapabilities';

/**
 * Check if a single capability is granted in the projection.
 * Returns `false` for missing/undefined projection, unknown keys.
 */
export function hasHomeCloudCapability(
  projection: HomeCloudCapabilitiesProjection | null | undefined,
  capability: HomeCloudCapability,
): boolean {
  return projection?.[capability] === true;
}

/**
 * Short alias for `hasHomeCloudCapability` used by unit tests.
 * Single typed authority - no parallel capability engine.
 */
export const can = hasHomeCloudCapability;

/**
 * Check if AT LEAST ONE capability is granted.
 */
export function canAny(
  projection: HomeCloudCapabilitiesProjection | null | undefined,
  ...capabilities: HomeCloudCapability[]
): boolean {
  return capabilities.some((cap) => hasHomeCloudCapability(projection, cap));
}

/**
 * Check if ALL listed capabilities are granted.
 */
export function canAll(
  projection: HomeCloudCapabilitiesProjection | null | undefined,
  ...capabilities: HomeCloudCapability[]
): boolean {
  return capabilities.every((cap) => hasHomeCloudCapability(projection, cap));
}

/**
 * Check if ALL listed capabilities are granted.
 */
export function hasAllHomeCloudCapabilities(
  projection: HomeCloudCapabilitiesProjection | null | undefined,
  ...capabilities: HomeCloudCapability[]
): boolean {
  return capabilities.every((cap) => hasHomeCloudCapability(projection, cap));
}

/**
 * Check if AT LEAST ONE capability is granted.
 */
export function hasAnyHomeCloudCapability(
  projection: HomeCloudCapabilitiesProjection | null | undefined,
  ...capabilities: HomeCloudCapability[]
): boolean {
  return capabilities.some((cap) => hasHomeCloudCapability(projection, cap));
}

// ---------------------------------------------------------------------------
// 2. Per-action capability guards (canonical HomeCloud actions)
// ---------------------------------------------------------------------------

/** Can the current member view HomeCloud content (lists, detail, search)? */
export function canViewHomeCloud(projection: HomeCloudCapabilitiesProjection | null | undefined): boolean {
  return hasHomeCloudCapability(projection, 'homecloud.view');
}

/** Can the current member contribute new content (upload files/memories)? */
export function canContributeHomeCloud(projection: HomeCloudCapabilitiesProjection | null | undefined): boolean {
  return hasHomeCloudCapability(projection, 'homecloud.contribute');
}

/** Can the current member organize existing content (folders, albums, metadata)? */
export function canOrganizeHomeCloud(projection: HomeCloudCapabilitiesProjection | null | undefined): boolean {
  return hasHomeCloudCapability(projection, 'homecloud.organize');
}

/** Can the current member delete content (trash, restore, purge)? */
export function canDeleteHomeCloud(projection: HomeCloudCapabilitiesProjection | null | undefined): boolean {
  return hasHomeCloudCapability(projection, 'homecloud.delete');
}

/**
 * Composite: can the member perform ANY write action (contribute/organize/delete)?
 * Used for showing/hiding the "add content" affordance in UI.
 */
export function canWriteHomeCloud(projection: HomeCloudCapabilitiesProjection | null | undefined): boolean {
  return hasAnyHomeCloudCapability(
    projection,
    'homecloud.contribute',
    'homecloud.organize',
    'homecloud.delete',
  );
}

/**
 * Evaluate the full HomeCloud capability matrix for the current projection.
 * Returns an object with all four capabilities and composite helpers.
 * Used by UI to render capability-aware affordances.
 */
export type HomeCloudCapabilityDescriptor = {
  readonly view: boolean;
  readonly contribute: boolean;
  readonly organize: boolean;
  readonly delete: boolean;
  readonly anyWrite: boolean;
};

export function evaluateHomeCloudCapabilities(
  projection: HomeCloudCapabilitiesProjection | null | undefined,
): HomeCloudCapabilityDescriptor {
  return {
    view: canViewHomeCloud(projection),
    contribute: canContributeHomeCloud(projection),
    organize: canOrganizeHomeCloud(projection),
    delete: canDeleteHomeCloud(projection),
    anyWrite: canWriteHomeCloud(projection),
  };
}