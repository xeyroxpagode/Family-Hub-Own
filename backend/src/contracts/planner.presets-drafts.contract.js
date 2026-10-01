'use strict';

const crypto = require('crypto');

const ENTITY_TYPES = Object.freeze(['task', 'event', 'plan']);
const PRESET_SOURCES = Object.freeze(['homeplus', 'personal', 'household']);
const DRAFT_INTENDED_SCOPES = Object.freeze(['personal', 'household']);
const PAYLOAD_SCHEMA = 'planner.template_payload';
const CURRENT_PAYLOAD_VERSION = 2;
const SUPPORTED_PAYLOAD_VERSIONS = Object.freeze([1, 2]);
const PLACEHOLDER_TYPES = Object.freeze([
  'person',
  'date',
  'place',
  'quantity_unit',
  'duration',
  'budget',
  'participants',
  'area',
  'resource',
]);

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key);
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const success = (value, warnings = []) => ({ ok: true, value, warnings });
const failure = (code, message, details = null) => ({ ok: false, code, message, details });

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (!isPlainObject(value)) {
    return JSON.stringify(value);
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',')}}`;
}

function structuralFingerprint(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function normalizePayloadEnvelope(input, expectedEntityType, adapterKey) {
  if (!isPlainObject(input)) {
    return failure('payload_schema_invalid', 'Payload envelope must be an object.');
  }
  if (input.entity_type !== expectedEntityType) {
    return failure('adapter_entity_mismatch', 'Payload entity_type does not match the adapter.');
  }
  if (input.adapter_key !== adapterKey) {
    return failure('adapter_not_found', 'Payload adapter_key does not match the adapter.');
  }
  if (input.payload_schema !== PAYLOAD_SCHEMA) {
    return failure('payload_schema_invalid', 'Payload schema is not supported.');
  }
  if (!Number.isInteger(input.payload_version)) {
    return failure('payload_schema_invalid', 'Payload version is required.');
  }
  if (!SUPPORTED_PAYLOAD_VERSIONS.includes(input.payload_version)) {
    return failure('payload_version_unsupported', 'Payload version is not supported.');
  }
  if (!hasOwn(input, 'payload') || !isPlainObject(input.payload)) {
    return failure('payload_schema_invalid', 'Payload body must be an object.');
  }
  return success({
    entityType: input.entity_type,
    adapterKey: input.adapter_key,
    payloadSchema: input.payload_schema,
    payloadVersion: input.payload_version,
    payload: cloneJson(input.payload),
  });
}

function buildPayloadEnvelope(entityType, adapterKey, payload, version = CURRENT_PAYLOAD_VERSION) {
  return {
    entity_type: entityType,
    adapter_key: adapterKey,
    payload_schema: PAYLOAD_SCHEMA,
    payload_version: version,
    payload: cloneJson(payload),
  };
}

function validatePlaceholders(placeholders) {
  if (placeholders === undefined) return success([]);
  if (!Array.isArray(placeholders)) {
    return failure('payload_schema_invalid', 'placeholders must be an array.');
  }
  const ids = new Set();
  const normalized = [];
  for (const placeholder of placeholders) {
    if (!isPlainObject(placeholder)) {
      return failure('payload_schema_invalid', 'Every placeholder must be an object.');
    }
    const id = normalizeString(placeholder.id);
    const type = normalizeString(placeholder.type);
    const path = normalizeString(placeholder.path);
    if (!id || !type || !path) {
      return failure('payload_schema_invalid', 'Every placeholder needs id, type and path.');
    }
    if (ids.has(id)) {
      return failure('payload_schema_invalid', 'Placeholder ids must be unique.');
    }
    if (!PLACEHOLDER_TYPES.includes(type)) {
      return failure('payload_schema_invalid', 'Placeholder type is not supported.');
    }
    if (!/^[A-Za-z0-9_.[\]-]+$/.test(path)) {
      return failure('payload_schema_invalid', 'Placeholder path is invalid.');
    }
    ids.add(id);
    normalized.push({
      id,
      type,
      path,
      required: Boolean(placeholder.required),
      ...(placeholder.label ? { label: normalizeString(placeholder.label) } : {}),
      ...(placeholder.constraints && isPlainObject(placeholder.constraints)
        ? { constraints: cloneJson(placeholder.constraints) }
        : {}),
    });
  }
  return success(normalized);
}

function findForbiddenPath(value, forbiddenNames, path = []) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findForbiddenPath(value[index], forbiddenNames, [...path, String(index)]);
      if (found) return found;
    }
    return null;
  }
  if (!isPlainObject(value)) return null;
  for (const key of Object.keys(value)) {
    if (forbiddenNames.has(key)) return [...path, key].join('.');
    const found = findForbiddenPath(value[key], forbiddenNames, [...path, key]);
    if (found) return found;
  }
  return null;
}

function normalizeCommonTemplatePayload(payload) {
  const normalized = cloneJson(payload);
  const placeholders = validatePlaceholders(normalized.placeholders);
  if (!placeholders.ok) return placeholders;
  normalized.placeholders = placeholders.value;
  if (normalized.reusableConfig === undefined) normalized.reusableConfig = {};
  if (!isPlainObject(normalized.reusableConfig)) {
    return failure('payload_schema_invalid', 'reusableConfig must be an object.');
  }
  return success(normalized);
}

function migratePayload(payload, fromVersion, toVersion) {
  if (!SUPPORTED_PAYLOAD_VERSIONS.includes(fromVersion) || toVersion !== CURRENT_PAYLOAD_VERSION) {
    return failure('payload_version_unsupported', 'Payload version migration is not supported.');
  }
  if (fromVersion === toVersion) return success(cloneJson(payload));
  if (fromVersion === 1 && toVersion === 2) {
    const migrated = cloneJson(payload);
    if (!hasOwn(migrated, 'placeholders')) migrated.placeholders = [];
    if (!hasOwn(migrated, 'reusableConfig')) migrated.reusableConfig = {};
    migrated.migratedFromVersion = 1;
    return success(migrated);
  }
  return failure('payload_version_unsupported', 'Payload version migration is not supported.');
}

function prepareApplicationDescriptor(adapter, context, payload) {
  const copy = cloneJson(payload);
  return {
    entityType: adapter.entityType,
    adapterKey: adapter.key,
    payloadSchema: PAYLOAD_SCHEMA,
    payloadVersion: CURRENT_PAYLOAD_VERSION,
    applicationPayload: copy,
    unresolvedPlaceholders: copy.placeholders ?? [],
    warnings: context?.warnings ?? [],
  };
}

module.exports = {
  CURRENT_PAYLOAD_VERSION,
  DRAFT_INTENDED_SCOPES,
  ENTITY_TYPES,
  PAYLOAD_SCHEMA,
  PLACEHOLDER_TYPES,
  PRESET_SOURCES,
  SUPPORTED_PAYLOAD_VERSIONS,
  buildPayloadEnvelope,
  cloneJson,
  failure,
  findForbiddenPath,
  hasOwn,
  isPlainObject,
  migratePayload,
  normalizeCommonTemplatePayload,
  normalizePayloadEnvelope,
  normalizeString,
  prepareApplicationDescriptor,
  stableStringify,
  structuralFingerprint,
  success,
  validatePlaceholders,
};
