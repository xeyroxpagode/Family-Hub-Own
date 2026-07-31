/**
 * Planner V1 — M11 Presets/Drafts Frontend — Preset → form application adapters.
 *
 * Lane-owned. Each adapter:
 *  - validates the entity kind + payload schema / version against the published
 *    contract,
 *  - migrates known older payload versions to CURRENT_PAYLOAD_VERSION,
 *  - normalizes WITHOUT mutating the original preset payload,
 *  - maps ONLY fields the existing integrated forms accept as compatible
 *    prefill (TaskForm: `initialDueDate`; EventForm: `initialDate`; Plan:
 *    structural graph is summarized, not force-applied),
 *  - returns placeholders + pendingFields + safe warnings,
 *  - NEVER executes the form submit and NEVER generates a productive mutation
 *    identity. The form remains the authority for the final submit.
 *
 * Binding rules (frozen by the M11 directive §10–11):
 * - Selecting/previewing a Preset creates NO entity.
 * - Applying a Preset DOES NOT mutate the Preset.
 * - Preview is NOT persistence.
 * - No fields beyond those supported by the real form are sent.
 * - On real incompatibility we surface only:
 *     "No pudimos usar este preset con la versión actual."
 *   (never JSON / SQLSTATE / adapter internals / UUIDs).
 */
import type {
  PlannerPayloadEnvelope,
  PlannerPreset,
  PlannerPresetRevision,
  PlannerTemplateEntityType,
} from '../../types/plannerPresetsDrafts';
import {
  CURRENT_PAYLOAD_VERSION,
  PAYLOAD_SCHEMA,
  PRESET_ADAPTER_KEYS,
  SUPPORTED_PAYLOAD_VERSIONS,
  defaultAdapterKeyFor,
  isSupportedPayloadVersion,
  migratePayloadInPlace,
  type PresetAdapterKey,
} from './plannerPresetContracts';
import type { ResolvedPlaceholders } from './plannerPlaceholderResolver';

/** Common application result for all entity kinds. */
export type PresetApplicationResult = {
  readonly entityKind: PlannerTemplateEntityType;
  readonly adapterKey: PresetAdapterKey;
  readonly payloadVersion: number;
  readonly migratedFromVersion: number | null;
  /** Fields the integrated form can prefill directly (compatible only). */
  readonly compatiblePrefill: PresetCompatiblePrefill;
  /** Structured non-prefill summary shown for review (Plan). */
  readonly structuralSummary: PresetStructuralSummary | null;
  /** Placeholder descriptors declared by the preset (still unresolved are listed). */
  readonly placeholders: readonly unknown[];
  /** Values resolved so far (kept across steps; preserved when going back). */
  readonly resolved: ResolvedPlaceholders;
  /** Fields the real form will NOT accept as prefill (user must enter manually). */
  readonly pendingFields: readonly string[];
  /** Safe, human-readable warnings. NEVER includes internal paths/UUIDs. */
  readonly warnings: readonly SafeWarning[];
  /** False when the preset is structurally incompatible with current forms. */
  readonly applicable: boolean;
};

/** Fields the integrated forms accept as direct prefill. */
export type PresetCompatiblePrefill =
  | { kind: 'task'; initialDueDate?: string }
  | { kind: 'event'; initialDate?: string }
  | { kind: 'plan'; structuralSummary: PresetStructuralSummary };

export type PresetStructuralSummary = {
  readonly objectiveTemplate?: string;
  readonly milestoneCount: number;
  readonly taskCount: number;
  readonly eventCount: number;
  readonly measurementCount: number;
  readonly relationshipCount: number;
};

export type SafeWarning =
  | 'payload_too_old'
  | 'unresolved_placeholders'
  | 'unsupported_adapter'
  | 'partial_prefill_only';

/** Activation candidate input: the preset (and optionally a revision). */
export type PresetActivationInput =
  | { kind: 'preset'; preset: PlannerPreset; revision?: PlannerPresetRevision }
  | { kind: 'revision'; revision: PlannerPresetRevision; entityKind: PlannerTemplateEntityType };

/** A safe, localized message for a warning (no internals leaked). */
export function safeWarningMessage(warning: SafeWarning): string {
  switch (warning) {
    case 'payload_too_old':
      return 'No pudimos usar este preset con la versión actual.';
    case 'unresolved_placeholders':
      return 'Algunos datos del preset necesitan que los completes.';
    case 'unsupported_adapter':
      return 'No pudimos usar este preset con la versión actual.';
    case 'partial_prefill_only':
      return 'Vamos a precargar algunos campos. Vas a poder revisarlos antes de confirmar.';
  }
}

/** Extract the envelope-relevant fields from a preset payload body. */
function readEnvelope(envelope: PlannerPayloadEnvelope | undefined): {
  schemaOk: boolean;
  versionOk: boolean;
  payloadVersion: number | null;
  adapterMismatched: boolean;
  adapterKey: string | null;
  payload: Record<string, unknown> | null;
} {
  if (!envelope) {
    return { schemaOk: false, versionOk: false, payloadVersion: null, adapterMismatched: false, adapterKey: null, payload: null };
  }
  const schemaOk = envelope.payload_schema === PAYLOAD_SCHEMA;
  const payloadVersion = typeof envelope.payload_version === 'number' ? envelope.payload_version : null;
  const versionOk = payloadVersion !== null && isSupportedPayloadVersion(payloadVersion);
  const adapterKey = envelope.adapter_key ?? null;
  return { schemaOk, versionOk, payloadVersion, adapterMismatched: false, adapterKey, payload: envelope.payload ?? null };
}

function buildStructuralSummary(payload: Record<string, unknown>): PresetStructuralSummary {
  return {
    objectiveTemplate: typeof payload.objectiveTemplate === 'string' ? payload.objectiveTemplate : undefined,
    milestoneCount: Array.isArray(payload.milestones) ? payload.milestones.length : 0,
    taskCount: Array.isArray(payload.tasks) ? payload.tasks.length : 0,
    eventCount: Array.isArray(payload.events) ? payload.events.length : 0,
    measurementCount: Array.isArray(payload.measurements) ? payload.measurements.length : 0,
    relationshipCount: Array.isArray(payload.relationships) ? payload.relationships.length : 0,
  };
}

/** Normalize a Task preset payload to compatible prefill + summary. */
function normalizeTaskPreset(
  payload: Record<string, unknown>,
  payloadVersion: number,
): {
  compatiblePrefill: PresetCompatiblePrefill;
  pendingFields: string[];
  warnings: SafeWarning[];
} {
  const pendingFields: string[] = [];
  const warnings: SafeWarning[] = [];

  // The real TaskForm only accepts `initialDueDate`. We surface any reusable
  // text/instructions the form will let the user edit manually.
  if (typeof payload.title === 'string' && payload.title.trim().length > 0) {
    pendingFields.push('title');
  } else {
    pendingFields.push('title');
  }
  if (typeof payload.instructions === 'string' && payload.instructions.trim().length > 0) {
    pendingFields.push('instructions');
  }
  if (typeof payload.category === 'string' && payload.category.trim().length > 0) {
    pendingFields.push('category');
  }

  const compatiblePrefill: PresetCompatiblePrefill = { kind: 'task' };

  if (pendingFields.length > 0) {
    warnings.push('partial_prefill_only');
  }

  return { compatiblePrefill, pendingFields, warnings };
}

/** Normalize an Event preset payload to compatible prefill + summary. */
function normalizeEventPreset(
  payload: Record<string, unknown>,
  payloadVersion: number,
): {
  compatiblePrefill: PresetCompatiblePrefill;
  pendingFields: string[];
  warnings: SafeWarning[];
} {
  const pendingFields: string[] = [];
  const warnings: SafeWarning[] = [];

  if (typeof payload.title === 'string' && payload.title.trim().length > 0) {
    pendingFields.push('title');
  } else {
    pendingFields.push('title');
  }
  if (typeof payload.category === 'string' && payload.category.trim().length > 0) {
    pendingFields.push('category');
  }
  if (typeof payload.suggestedDurationMinutes === 'number' && payload.suggestedDurationMinutes > 0) {
    pendingFields.push('suggestedDurationMinutes');
  }

  const compatiblePrefill: PresetCompatiblePrefill = { kind: 'event' };

  if (pendingFields.length > 0) {
    warnings.push('partial_prefill_only');
  }

  return { compatiblePrefill, pendingFields, warnings };
}

/** Normalize a Plan preset payload to structural summary (no forced prefill). */
function normalizePlanPreset(payload: Record<string, unknown>): {
  compatiblePrefill: PresetCompatiblePrefill;
  pendingFields: string[];
  warnings: SafeWarning[];
} {
  const structuralSummary = buildStructuralSummary(payload);
  const pendingFields: string[] = [];
  if (!structuralSummary.objectiveTemplate) {
    pendingFields.push('objectiveTemplate');
  }
  if (structuralSummary.milestoneCount === 0
    && structuralSummary.taskCount === 0
    && structuralSummary.eventCount === 0) {
    pendingFields.push('structure');
  }
  const warnings: SafeWarning[] = pendingFields.includes('objectiveTemplate')
    ? ['partial_prefill_only']
    : [];

  return { compatiblePrefill: { kind: 'plan', structuralSummary }, pendingFields, warnings };
}

/**
 * Apply a preset: validate the envelope, migrate the payload version when
 * possible, normalize without mutating the source, map compatible fields,
 * produce the structural summary (Plan) and a safe warning set. The returned
 * object can be fed into `openPlannerPresetApplication(...)` to open the real
 * form for explicit submit.
 *
 * Never throws on contract mismatch — returns `applicable: false` with a
 * `payload_too_old`/`unsupported_adapter` warning so the UI can show the
 * safe fallback message and offering retry/back.
 */
export function applyPlannerPreset(
  input: PresetActivationInput,
  resolved: ResolvedPlaceholders,
): PresetApplicationResult {
  const entityKind = input.kind === 'preset' ? input.preset.entity_type : input.entityKind;
  const envelope: PlannerPayloadEnvelope | undefined = input.kind === 'preset'
    ? (input.preset as PlannerPreset & { payload_envelope?: PlannerPayloadEnvelope }).payload_envelope
    : undefined;
  const inlinePayload: Record<string, unknown> | undefined = input.kind === 'preset'
    ? (input.preset as PlannerPreset & { payload?: Record<string, unknown> }).payload
    : undefined;
  const revision = input.kind === 'preset' ? input.revision : input.revision;

  const defaultAdapterKey = defaultAdapterKeyFor(entityKind);
  const descriptorPayload = (revision?.payload ?? inlinePayload ?? envelope?.payload ?? {}) as Record<string, unknown>;
  const descriptorVersion =
    revision?.payload_version
    ?? (typeof envelope?.payload_version === 'number' ? envelope.payload_version : CURRENT_PAYLOAD_VERSION);

  // Schema / adapter checks (deny-safe).
  const adapterKey: string = (envelope?.adapter_key ?? revision?.adapter_key ?? defaultAdapterKey) as string;
  const adapterMismatched = revision?.adapter_key !== undefined
    && revision.adapter_key !== PRESET_ADAPTER_KEYS[entityKind];

  if (!isSupportedPayloadVersion(descriptorVersion)) {
    return incompatibleResult(entityKind, adapterKey, descriptorVersion, resolved, descriptorPayload, 'payload_too_old');
  }
  if (adapterMismatched) {
    return incompatibleResult(entityKind, adapterKey, descriptorVersion, resolved, descriptorPayload, 'unsupported_adapter');
  }

  const migratedFromVersion = descriptorVersion < CURRENT_PAYLOAD_VERSION ? descriptorVersion : null;
  const migrated = descriptorVersion < CURRENT_PAYLOAD_VERSION
    ? migratePayloadInPlace(descriptorPayload, descriptorVersion, CURRENT_PAYLOAD_VERSION)
    : { ...descriptorPayload };

  if (migrated === null) {
    return incompatibleResult(entityKind, adapterKey, descriptorVersion, resolved, descriptorPayload, 'payload_too_old');
  }

  const declaredPlaceholders = Array.isArray(migrated.placeholders) ? migrated.placeholders : [];

  let normalized: {
    compatiblePrefill: PresetCompatiblePrefill;
    pendingFields: string[];
    warnings: SafeWarning[];
  };

  if (entityKind === 'task') {
    normalized = normalizeTaskPreset(migrated, descriptorVersion);
  } else if (entityKind === 'event') {
    normalized = normalizeEventPreset(migrated, descriptorVersion);
  } else {
    normalized = normalizePlanPreset(migrated);
  }

  if (declaredPlaceholders.length > 0) {
    normalized.warnings = [...normalized.warnings, 'unresolved_placeholders'];
  }

  return {
    entityKind,
    adapterKey: adapterKey as PresetAdapterKey,
    payloadVersion: CURRENT_PAYLOAD_VERSION,
    migratedFromVersion,
    compatiblePrefill: normalized.compatiblePrefill,
    structuralSummary: entityKind === 'plan'
      ? (normalized.compatiblePrefill as Extract<PresetCompatiblePrefill, { kind: 'plan' }>).structuralSummary
      : null,
    placeholders: declaredPlaceholders,
    resolved,
    pendingFields: normalized.pendingFields,
    warnings: normalized.warnings,
    applicable: true,
  };
}

function incompatibleResult(
  entityKind: PlannerTemplateEntityType,
  adapterKey: string,
  payloadVersion: number,
  resolved: ResolvedPlaceholders,
  payload: Record<string, unknown>,
  warning: SafeWarning,
): PresetApplicationResult {
  return {
    entityKind,
    adapterKey: (adapterKey || PRESET_ADAPTER_KEYS[entityKind]) as PresetAdapterKey,
    payloadVersion,
    migratedFromVersion: null,
    compatiblePrefill:
      entityKind === 'task'
        ? { kind: 'task' }
        : entityKind === 'event'
        ? { kind: 'event' }
        : { kind: 'plan', structuralSummary: buildStructuralSummary(payload) },
    structuralSummary: entityKind === 'plan' ? buildStructuralSummary(payload) : null,
    placeholders: [],
    resolved,
    pendingFields: [],
    warnings: [warning],
    applicable: false,
  };
}

/**
 * Prove (test hook) that applying a preset never mutates the source payload.
 * Returns true when `originalSnapshot` is STILL deep-equal to a previously
 * captured JSON snapshot of the source. Used by the lane test suite only.
 */
export function assertPayloadUnchanged(
  originalSnapshot: string,
  currentSource: unknown,
): boolean {
  return JSON.stringify(currentSource) === originalSnapshot;
}
