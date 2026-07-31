/**
 * Planner V1 — M11 Presets/Drafts Frontend — Draft → form application adapters.
 *
 * Lane-owned. Each draft adapter:
 *  - validates the owner / user generation / household generation (when
 *    applicable) against the recovered Draft,
 *  - validates the payload schema / version and migrates known older versions,
 *  - normalizes WITHOUT mutating the source Draft payload,
 *  - maps the draft payload to the existing integrated update/create form's
 *    compatible fields,
 *  - preserves the source preset/revision reference when the contract carries
 *    one (only if requested, by caller),
 *  - NEVER executes submit. The form is the authority for the final submit.
 *
 * Binding rules (frozen by the M11 directive §13–14):
 * - Drafts are private. Listing/reading never projects them as entities.
 * - intended_household_id does NOT publish to household surfaces.
 * - Recovery validates owner = current user before opening the form.
 * - Submit is always explicit; recovery only OPENS the form prefilled.
 */
import type {
  PlannerDraft,
  PlannerDraftIntendedScope,
  PlannerTemplateEntityType,
} from '../../types/plannerPresetsDrafts';
import {
  CURRENT_PAYLOAD_VERSION,
  PRESET_ADAPTER_KEYS,
  SUPPORTED_PAYLOAD_VERSIONS,
  isSupportedPayloadVersion,
  migratePayloadInPlace,
  type PresetAdapterKey,
} from './plannerPresetContracts';
import type { ResolvedPlaceholders } from './plannerPlaceholderResolver';

/** Draft activation result fed into a real edit/create form. */
export type DraftApplicationResult = {
  entityKind: PlannerTemplateEntityType;
  adapterKey: PresetAdapterKey;
  payloadVersion: number;
  migratedFromVersion: number | null;
  /** Compatible prefill fields for the integrated form. */
  compatiblePrefill: DraftCompatiblePrefill;
  /** Fields the form will need the user to complete manually. */
  pendingFields: string[];
  /** Whether the recovered draft is privately owned by `currentOwnerId`. */
  privateToCurrentUser: boolean;
  /** True when the recovered draft carries an intended household scope. */
  intendedHousehold: boolean;
  /** Resolved placeholders carried over from the persisted draft. */
  resolved: ResolvedPlaceholders;
  /** Safe warnings (no internals). */
  warnings: readonly DraftSafeWarning[];
  /** False when the draft is structurally incompatible with current forms. */
  applicable: boolean;
};

export type DraftCompatiblePrefill =
  | { kind: 'task'; title?: string; instructions?: string; category?: string }
  | { kind: 'event'; title?: string; category?: string; suggestedDurationMinutes?: number }
  | { kind: 'plan'; objectiveTemplate?: string; milestoneHints: number; taskHints: number; eventHints: number };

export type DraftSafeWarning =
  | 'payload_version_unsupported'
  | 'owner_mismatch'
  | 'partial_prefill_only';

export function draftSafeWarningMessage(warning: DraftSafeWarning): string {
  switch (warning) {
    case 'payload_version_unsupported':
      return 'No pudimos abrir este borrador con la versión actual.';
    case 'owner_mismatch':
      return 'No pudimos abrir este borrador.';
    case 'partial_prefill_only':
      return 'Cargamos el borrador anterior. Vas a poder revisarlo antes de confirmar.';
  }
}

/** Validate owner / scope admissibility for a recovered draft. */
export function isDraftRecoverableForOwner(
  draft: PlannerDraft,
  currentOwnerId: string,
): boolean {
  return typeof draft.owner_person_id === 'string'
    && currentOwnerId === draft.owner_person_id;
}

/** Apply (open) a recovered draft. Mirrors the preset adapter semantics. */
export function applyPlannerDraft(
  draft: PlannerDraft,
  currentOwnerId: string,
  resolved: ResolvedPlaceholders,
): DraftApplicationResult {
  const entityKind = draft.entity_type;

  if (!isDraftRecoverableForOwner(draft, currentOwnerId)) {
    return incompatibleDraftResult(draft, resolved, 'owner_mismatch', draft.payload_version);
  }

  if (!isSupportedPayloadVersion(draft.payload_version)) {
    return incompatibleDraftResult(draft, resolved, 'payload_version_unsupported', draft.payload_version);
  }

  const migratedFromVersion = draft.payload_version < CURRENT_PAYLOAD_VERSION ? draft.payload_version : null;
  const payload = draft.payload_version < CURRENT_PAYLOAD_VERSION
    ? migratePayloadInPlace(draft.payload, draft.payload_version, CURRENT_PAYLOAD_VERSION)
    : { ...draft.payload };

  if (payload === null) {
    return incompatibleDraftResult(draft, resolved, 'payload_version_unsupported', draft.payload_version);
  }

  const adapterKey = (draft.adapter_key || PRESET_ADAPTER_KEYS[entityKind]) as PresetAdapterKey;

  let compatiblePrefill: DraftCompatiblePrefill;
  let pendingFields: string[] = [];
  const warnings: DraftSafeWarning[] = [];

  if (entityKind === 'task') {
    compatiblePrefill = {
      kind: 'task',
      title: typeof payload.title === 'string' ? payload.title : undefined,
      instructions: typeof payload.instructions === 'string' ? payload.instructions : undefined,
      category: typeof payload.category === 'string' ? payload.category : undefined,
    };
    if (!compatiblePrefill.title) pendingFields.push('title');
  } else if (entityKind === 'event') {
    compatiblePrefill = {
      kind: 'event',
      title: typeof payload.title === 'string' ? payload.title : undefined,
      category: typeof payload.category === 'string' ? payload.category : undefined,
      suggestedDurationMinutes: typeof payload.suggestedDurationMinutes === 'number'
        ? payload.suggestedDurationMinutes
        : undefined,
    };
    if (!compatiblePrefill.title) pendingFields.push('title');
  } else {
    const milestoneHints = Array.isArray(payload.milestones) ? payload.milestones.length : 0;
    const taskHints = Array.isArray(payload.tasks) ? payload.tasks.length : 0;
    const eventHints = Array.isArray(payload.events) ? payload.events.length : 0;
    compatiblePrefill = {
      kind: 'plan',
      objectiveTemplate: typeof payload.objectiveTemplate === 'string' ? payload.objectiveTemplate : undefined,
      milestoneHints,
      taskHints,
      eventHints,
    };
    if (!compatiblePrefill.objectiveTemplate) pendingFields.push('objectiveTemplate');
    if (milestoneHints === 0 && taskHints === 0 && eventHints === 0) {
      pendingFields.push('structure');
    }
  }

  if (pendingFields.length > 0) warnings.push('partial_prefill_only');

  return {
    entityKind,
    adapterKey,
    payloadVersion: CURRENT_PAYLOAD_VERSION,
    migratedFromVersion,
    compatiblePrefill,
    pendingFields,
    privateToCurrentUser: true,
    intendedHousehold: draft.intended_scope === 'household',
    resolved,
    warnings,
    applicable: true,
  };
}

function incompatibleDraftResult(
  draft: PlannerDraft,
  resolved: ResolvedPlaceholders,
  warning: DraftSafeWarning,
  payloadVersion: number,
): DraftApplicationResult {
  return {
    entityKind: draft.entity_type,
    adapterKey: (draft.adapter_key || PRESET_ADAPTER_KEYS[draft.entity_type]) as PresetAdapterKey,
    payloadVersion,
    migratedFromVersion: null,
    compatiblePrefill:
      draft.entity_type === 'task'
        ? { kind: 'task' }
        : draft.entity_type === 'event'
        ? { kind: 'event' }
        : { kind: 'plan', objectiveTemplate: undefined, milestoneHints: 0, taskHints: 0, eventHints: 0 },
    pendingFields: [],
    privateToCurrentUser: warning !== 'owner_mismatch',
    intendedHousehold: draft.intended_scope === 'household',
    resolved,
    warnings: [warning],
    applicable: false,
  };
}

/**
 * True when the draft payload has meaningful content worth offering
 * "continue / discard". Mirrors the backend adapter's meaningful-content rule.
 */
export function hasMeaningfulDraftContent(payload: Record<string, unknown>): boolean {
  const copy = { ...payload } as Record<string, unknown>;
  delete copy.clientRevision;
  delete copy.lastLocalEditAt;
  delete copy.placeholders;
  delete copy.reusableConfig;
  return Object.values(copy).some((value) => {
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (value !== null && typeof value === 'object') return Object.keys(value).length > 0;
    return value !== null && value !== undefined && value !== false;
  });
}
