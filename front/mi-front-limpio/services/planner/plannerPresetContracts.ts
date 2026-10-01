/**
 * Planner V1 — M11 Presets/Drafts Frontend — Preset/Draft runtime contract.
 *
 * Lane-owned mirror of the backend contract `contracts/planner.presets-drafts.contract.js`.
 * This module deliberately re-publishes the canonical constants and types the
 * frontend needs WITHOUT importing the backend source, so it can be unit-tested
 * in the compiled-test harness (which has no access to backend modules).
 *
 * The values here MUST stay in lock-step with the backend contract. Any drift
 * is treated as an integration contract mismatch (failure).
 *
 * Out of scope:
 * - HTTP transport (lives in `services/plannerPresets.ts` / `plannerDrafts.ts`).
 * - Form adapters (live in `plannerPresetAdapters.ts` / `plannerDraftAdapters.ts`).
 */
import type {
  PlannerTemplateEntityType,
  PlannerPresetSource,
  PlannerDraftIntendedScope,
  PlannerRevisionState,
  PlannerPlaceholderType,
} from '../../types/plannerPresetsDrafts';

/** Entity kinds supported by the template system. Mirrors backend `ENTITY_TYPES`. */
export const PRESET_ENTITY_TYPES: readonly PlannerTemplateEntityType[] = ['task', 'event', 'plan'] as const;

/** Preset origins. Mirrors backend `PRESET_SOURCES`. */
export const PRESET_SOURCES: readonly PlannerPresetSource[] = ['homeplus', 'personal', 'household'] as const;

/** Draft intended scope. Mirrors backend `DRAFT_INTENDED_SCOPES`. */
export const DRAFT_INTENDED_SCOPES: readonly PlannerDraftIntendedScope[] = [
  'personal',
  'household',
] as const;

/** Revision states. Mirrors backend revision lifecycle. */
export const REVISION_STATES: readonly PlannerRevisionState[] = [
  'draft',
  'published',
  'superseded',
] as const;

/**
 * Placeholder types published by the backend contract.
 * These are EXACTLY the types in `PLACEHOLDER_TYPES`. Frontend MUST NOT
 * invent extra placeholder types.
 */
export const PLACEHOLDER_TYPES: readonly PlannerPlaceholderType[] = [
  'person',
  'date',
  'place',
  'quantity_unit',
  'duration',
  'budget',
  'participants',
  'area',
  'resource',
] as const;

/** Canonical payload schema identifier. */
export const PAYLOAD_SCHEMA = 'planner.template_payload' as const;

/** Currently supported payload versions (mirrors `SUPPORTED_PAYLOAD_VERSIONS`). */
export const SUPPORTED_PAYLOAD_VERSIONS = [1, 2] as const;

/** Most recent payload version the frontend emits. */
export const CURRENT_PAYLOAD_VERSION = 2;

/** Adapter keys published by the backend. */
export const PRESET_ADAPTER_KEYS = {
  task: 'planner.task.template.v1',
  event: 'planner.event.template.v1',
  plan: 'planner.plan.template.v1',
} as const;

export type PresetAdapterKey = (typeof PRESET_ADAPTER_KEYS)[keyof typeof PRESET_ADAPTER_KEYS];

/** Default adapter key for a given entity kind. Throws for unknown kinds. */
export function defaultAdapterKeyFor(entityKind: PlannerTemplateEntityType): PresetAdapterKey {
  const key = PRESET_ADAPTER_KEYS[entityKind];
  if (!key) {
    throw new Error(`No default adapter for entity kind ${entityKind}`);
  }
  return key;
}

/** Type guard: a candidate value is a published placeholder type. */
export function isPlannerPlaceholderType(value: unknown): value is PlannerPlaceholderType {
  return typeof value === 'string' && (PLACEHOLDER_TYPES as readonly string[]).includes(value);
}

/** Type guard: a candidate value is a published preset source. */
export function isPlannerPresetSource(value: unknown): value is PlannerPresetSource {
  return typeof value === 'string' && (PRESET_SOURCES as readonly string[]).includes(value);
}

/** Type guard: a candidate value is a published draft intended scope. */
export function isPlannerDraftIntendedScope(value: unknown): value is PlannerDraftIntendedScope {
  return typeof value === 'string' && (DRAFT_INTENDED_SCOPES as readonly string[]).includes(value);
}

/** Type guard: a candidate value is a published revision state. */
export function isPlannerRevisionState(value: unknown): value is PlannerRevisionState {
  return typeof value === 'string' && (REVISION_STATES as readonly string[]).includes(value);
}

/** True when the payload version is one the frontend can consume. */
export function isSupportedPayloadVersion(version: unknown): boolean {
  return typeof version === 'number' && (SUPPORTED_PAYLOAD_VERSIONS as readonly number[]).includes(version);
}

/** Migrate a known older payload version to the CURRENT_PAYLOAD_VERSION shape. Returns null when migration is unsupported. */
export function migratePayloadInPlace(
  payload: Record<string, unknown>,
  fromVersion: number,
  toVersion: number = CURRENT_PAYLOAD_VERSION,
): Record<string, unknown> | null {
  if (!isSupportedPayloadVersion(fromVersion) || toVersion !== CURRENT_PAYLOAD_VERSION) {
    return null;
  }
  if (fromVersion === toVersion) {
    return { ...payload };
  }
  if (fromVersion === 1 && toVersion === 2) {
    const migrated = { ...payload };
    if (!('placeholders' in migrated)) migrated.placeholders = [];
    if (!('reusableConfig' in migrated)) migrated.reusableConfig = {};
    migrated.migratedFromVersion = 1;
    return migrated;
  }
  return null;
}
