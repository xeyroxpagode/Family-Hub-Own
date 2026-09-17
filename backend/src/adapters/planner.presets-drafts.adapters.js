'use strict';

const {
  CURRENT_PAYLOAD_VERSION,
  buildPayloadEnvelope,
  cloneJson,
  failure,
  findForbiddenPath,
  isPlainObject,
  migratePayload: migrateEnvelopePayload,
  normalizeCommonTemplatePayload,
  normalizeString,
  prepareApplicationDescriptor,
  structuralFingerprint,
  success,
  normalizePayloadEnvelope,
} = require('../contracts/planner.presets-drafts.contract');

const FORBIDDEN_TASK_PRESET_FIELDS = new Set([
  'dueDate',
  'due_date',
  'dueTime',
  'due_time',
  'assignee',
  'assignees',
  'assigned_to_member_id',
  'participants',
  'completion',
  'completed_at',
  'fulfillment',
  'verification',
  'evidence',
  'status',
  'lifecycle',
  'progress',
  'recurrence',
  'history',
  'measurementValue',
]);

const FORBIDDEN_EVENT_PRESET_FIELDS = new Set([
  'date',
  'startDate',
  'start_date',
  'startTime',
  'start_time',
  'participants',
  'participantIds',
  'location',
  'rsvp',
  'attendance',
  'recurrence',
  'status',
  'lifecycle',
  'history',
]);

const FORBIDDEN_PLAN_PRESET_FIELDS = new Set([
  'absoluteDate',
  'absolute_date',
  'date',
  'assignee',
  'assignees',
  'participants',
  'personIds',
  'progress',
  'completionRecords',
  'completed_at',
  'rsvp',
  'attendance',
  'evidence',
  'currentValue',
  'current_value',
  'inventoryState',
  'inventory_state',
  'status',
  'lifecycle',
  'history',
]);

const FORBIDDEN_DRAFT_FIELDS = new Set([
  'status',
  'lifecycle',
  'activity',
  'activityLog',
  'notification',
  'notifications',
  'badge',
  'fulfillmentState',
  'recurrenceInstance',
  'createdTaskId',
  'createdEventId',
  'createdPlanId',
]);

function ensureObjectPayload(input) {
  if (!isPlainObject(input)) {
    return failure('payload_schema_invalid', 'Payload must be an object.');
  }
  return success(cloneJson(input));
}

function normalizeTextFields(payload, textFields) {
  const copy = cloneJson(payload);
  for (const field of textFields) {
    if (copy[field] !== undefined) copy[field] = normalizeString(copy[field]);
  }
  return copy;
}

function validateNoForbidden(payload, forbidden) {
  const path = findForbiddenPath(payload, forbidden);
  if (path) {
    return failure('payload_schema_invalid', `Forbidden operational field: ${path}.`, { path });
  }
  return success(payload);
}

function createAdapter({ key, entityType, requiredField, presetForbidden, draftForbidden, normalize }) {
  const adapter = {
    key,
    entityType,
    currentPayloadVersion: CURRENT_PAYLOAD_VERSION,

    validatePresetPayload(input) {
      const object = ensureObjectPayload(input);
      if (!object.ok) return object;
      const forbidden = validateNoForbidden(object.value, presetForbidden);
      if (!forbidden.ok) return forbidden;
      const normalized = normalizeCommonTemplatePayload(normalize(forbidden.value, 'preset'));
      if (!normalized.ok) return normalized;
      if (!normalizeString(normalized.value[requiredField]) && entityType !== 'plan') {
        return failure('payload_schema_invalid', `${requiredField} is required.`);
      }
      if (entityType === 'plan' && !normalizeString(normalized.value.objectiveTemplate)) {
        return failure('payload_schema_invalid', 'objectiveTemplate is required.');
      }
      return success(normalized.value);
    },

    validateDraftPayload(input) {
      const object = ensureObjectPayload(input);
      if (!object.ok) return object;
      const forbidden = validateNoForbidden(object.value, draftForbidden);
      if (!forbidden.ok) return forbidden;
      const normalized = normalizeCommonTemplatePayload(normalize(forbidden.value, 'draft'));
      if (!normalized.ok) return normalized;
      return success(normalized.value);
    },

    normalizePresetPayload(payload) {
      return this.validatePresetPayload(payload).value;
    },

    normalizeDraftPayload(payload) {
      return this.validateDraftPayload(payload).value;
    },

    hasMeaningfulDraftContent(payload) {
      const copy = cloneJson(payload);
      delete copy.clientRevision;
      delete copy.lastLocalEditAt;
      delete copy.placeholders;
      delete copy.reusableConfig;
      return Object.values(copy).some((value) => {
        if (typeof value === 'string') return value.trim().length > 0;
        if (Array.isArray(value)) return value.length > 0;
        if (isPlainObject(value)) return Object.keys(value).length > 0;
        return value !== null && value !== undefined && value !== false;
      });
    },

    getStructuralFingerprint(payload) {
      return structuralFingerprint(this.validateDraftPayload(payload).ok
        ? this.normalizeDraftPayload(payload)
        : payload);
    },

    migratePayload(payload, fromVersion, toVersion) {
      const migrated = migrateEnvelopePayload(payload, fromVersion, toVersion);
      if (!migrated.ok) return migrated;
      return this.validateDraftPayload(migrated.value);
    },

    prepareApplicationPayload(context, payload) {
      const normalized = this.normalizeDraftPayload(payload);
      return prepareApplicationDescriptor(adapter, context, normalized);
    },
  };
  return Object.freeze(adapter);
}

const taskAdapter = createAdapter({
  key: 'planner.task.template.v1',
  entityType: 'task',
  requiredField: 'title',
  presetForbidden: FORBIDDEN_TASK_PRESET_FIELDS,
  draftForbidden: FORBIDDEN_DRAFT_FIELDS,
  normalize(payload) {
    const normalized = normalizeTextFields(payload, ['title', 'instructions', 'category']);
    if (!isPlainObject(normalized.visual ?? {})) normalized.visual = {};
    return normalized;
  },
});

const eventAdapter = createAdapter({
  key: 'planner.event.template.v1',
  entityType: 'event',
  requiredField: 'title',
  presetForbidden: FORBIDDEN_EVENT_PRESET_FIELDS,
  draftForbidden: FORBIDDEN_DRAFT_FIELDS,
  normalize(payload) {
    const normalized = normalizeTextFields(payload, ['title', 'category']);
    if (normalized.suggestedDurationMinutes !== undefined) {
      const duration = Number(normalized.suggestedDurationMinutes);
      if (!Number.isFinite(duration) || duration <= 0) {
        return { ...normalized, suggestedDurationMinutes: undefined };
      }
      normalized.suggestedDurationMinutes = duration;
    }
    return normalized;
  },
});

const planAdapter = createAdapter({
  key: 'planner.plan.template.v1',
  entityType: 'plan',
  requiredField: 'objectiveTemplate',
  presetForbidden: FORBIDDEN_PLAN_PRESET_FIELDS,
  draftForbidden: FORBIDDEN_DRAFT_FIELDS,
  normalize(payload) {
    const normalized = normalizeTextFields(payload, ['objectiveTemplate']);
    normalized.milestones = Array.isArray(normalized.milestones) ? normalized.milestones : [];
    normalized.tasks = Array.isArray(normalized.tasks) ? normalized.tasks : [];
    normalized.events = Array.isArray(normalized.events) ? normalized.events : [];
    normalized.measurements = Array.isArray(normalized.measurements) ? normalized.measurements : [];
    normalized.relationships = Array.isArray(normalized.relationships) ? normalized.relationships : [];
    return normalized;
  },
});

const adapters = Object.freeze([taskAdapter, eventAdapter, planAdapter]);
const adaptersByKey = new Map(adapters.map((adapter) => [adapter.key, adapter]));
const adaptersByEntity = new Map(adapters.map((adapter) => [adapter.entityType, adapter]));

function getAdapter(adapterKey, entityType = null) {
  const adapter = adaptersByKey.get(adapterKey);
  if (!adapter) return failure('adapter_not_found', 'Adapter not found.');
  if (entityType && adapter.entityType !== entityType) {
    return failure('adapter_entity_mismatch', 'Adapter does not support the requested entity type.');
  }
  return success(adapter);
}

function getDefaultAdapter(entityType) {
  const adapter = adaptersByEntity.get(entityType);
  return adapter ? success(adapter) : failure('adapter_not_found', 'Adapter not found.');
}

function validateEnvelopeForUse(envelope, kind) {
  const normalizedEnvelope = normalizePayloadEnvelope(envelope, envelope?.entity_type, envelope?.adapter_key);
  if (!normalizedEnvelope.ok) return normalizedEnvelope;
  const adapterResult = getAdapter(envelope.adapter_key, envelope.entity_type);
  if (!adapterResult.ok) return adapterResult;
  const adapter = adapterResult.value;
  const migration = adapter.migratePayload(
    envelope.payload,
    envelope.payload_version,
    adapter.currentPayloadVersion,
  );
  if (!migration.ok) return migration;
  const validation = kind === 'preset'
    ? adapter.validatePresetPayload(migration.value)
    : adapter.validateDraftPayload(migration.value);
  if (!validation.ok) return validation;
  return success({
    adapter,
    envelope: buildPayloadEnvelope(adapter.entityType, adapter.key, validation.value),
    payload: validation.value,
    fingerprint: adapter.getStructuralFingerprint(validation.value),
  });
}

module.exports = {
  adapters,
  getAdapter,
  getDefaultAdapter,
  validateEnvelopeForUse,
};
