'use strict';

const crypto = require('node:crypto');

const EXPOSURES = new Set(['server_only', 'client_visible']);
const KEY_RE = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/;

function validateDefinition(definition) {
  if (!definition || typeof definition !== 'object') throw new TypeError('Feature flag definition is required.');
  if (!KEY_RE.test(definition.key)) throw new TypeError(`Invalid feature flag key: ${String(definition.key)}`);
  if (!definition.description?.trim()) throw new TypeError(`Feature flag ${definition.key} needs a description.`);
  if (!definition.owner?.trim()) throw new TypeError(`Feature flag ${definition.key} needs an owner.`);
  if (typeof definition.defaultValue !== 'boolean') throw new TypeError(`Feature flag ${definition.key} needs a boolean default.`);
  if (!EXPOSURES.has(definition.exposure)) throw new TypeError(`Feature flag ${definition.key} has invalid exposure.`);
  if (definition.environments !== undefined && (
    !Array.isArray(definition.environments)
    || definition.environments.length === 0
    || definition.environments.some((entry) => typeof entry !== 'string' || !entry.trim())
  )) throw new TypeError(`Feature flag ${definition.key} has invalid environments.`);
  if (definition.expiresAt !== undefined && definition.expiresAt !== null && Number.isNaN(Date.parse(definition.expiresAt))) {
    throw new TypeError(`Feature flag ${definition.key} has invalid expiresAt.`);
  }
  return Object.freeze({
    ...definition,
    description: definition.description.trim(),
    owner: definition.owner.trim(),
    environments: definition.environments ? Object.freeze([...definition.environments]) : undefined,
    expiresAt: definition.expiresAt ?? null,
  });
}

function createFeatureFlagRegistry() {
  const definitions = new Map();
  return Object.freeze({
    register(domainDefinitions) {
      if (!Array.isArray(domainDefinitions)) throw new TypeError('Feature flag definitions must be an array.');
      for (const input of domainDefinitions) {
        const definition = validateDefinition(input);
        if (definitions.has(definition.key)) throw new TypeError(`Duplicate feature flag: ${definition.key}`);
        definitions.set(definition.key, definition);
      }
    },
    get(key) {
      return definitions.get(key) ?? null;
    },
    list() {
      return [...definitions.values()];
    },
  });
}

function stableRolloutBucket(flagKey, identity) {
  if (!identity) return null;
  const digest = crypto.createHash('sha256').update(`${flagKey}:${identity}`).digest();
  return digest.readUInt32BE(0) % 100;
}

function isOverrideActive(override, now) {
  if (override.starts_at && Date.parse(override.starts_at) > now.getTime()) return false;
  if (override.ends_at && Date.parse(override.ends_at) <= now.getTime()) return false;
  return true;
}

function chooseOverride(overrides, householdId, now) {
  const active = (overrides ?? []).filter((override) => isOverrideActive(override, now));
  const household = householdId
    ? active.find((override) => override.scope_type === 'household' && override.scope_id === householdId)
    : null;
  return household ?? active.find((override) => override.scope_type === 'global') ?? null;
}

function evaluateFeatureFlag(definition, context = {}, overrides = []) {
  if (!definition) return Object.freeze({ enabled: false, reason: 'unknown_flag', bucket: null });
  const environment = context.environment || 'development';
  const now = context.now instanceof Date ? context.now : new Date();
  const applicable = (overrides ?? []).filter((override) => override.flag_key === definition.key && override.environment === environment);

  if (context.globalKillSwitch === true || applicable.some((override) => override.kill_switch === true && isOverrideActive(override, now))) {
    return Object.freeze({ enabled: false, reason: 'kill_switch', bucket: null });
  }
  if (definition.expiresAt && Date.parse(definition.expiresAt) <= now.getTime()) {
    return Object.freeze({ enabled: false, reason: 'expired', bucket: null });
  }
  if (definition.environments && !definition.environments.includes(environment)) {
    return Object.freeze({ enabled: false, reason: 'environment', bucket: null });
  }

  const override = chooseOverride(applicable, context.householdId ?? null, now);
  if (!override) return Object.freeze({ enabled: definition.defaultValue, reason: 'default', bucket: null });
  if (override.enabled === false) return Object.freeze({ enabled: false, reason: 'override_disabled', bucket: null });
  if (override.enabled !== true) return Object.freeze({ enabled: false, reason: 'invalid_override', bucket: null });

  const percentage = override.rollout_percentage;
  if (percentage === null || percentage === undefined || percentage === 100) {
    return Object.freeze({ enabled: true, reason: 'override_enabled', bucket: null });
  }
  if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
    return Object.freeze({ enabled: false, reason: 'invalid_override', bucket: null });
  }
  if (percentage === 0) return Object.freeze({ enabled: false, reason: 'rollout', bucket: null });
  const bucket = stableRolloutBucket(definition.key, context.rolloutIdentity);
  if (bucket === null) return Object.freeze({ enabled: false, reason: 'missing_rollout_identity', bucket: null });
  return Object.freeze({ enabled: bucket < percentage, reason: 'rollout', bucket });
}

function projectClientVisibleFeatureFlags(definitions, evaluatedValues) {
  const projection = {};
  for (const definition of definitions) {
    if (definition.exposure !== 'client_visible') continue;
    projection[definition.key] = evaluatedValues?.[definition.key] === true;
  }
  return Object.freeze(projection);
}

module.exports = {
  createFeatureFlagRegistry,
  evaluateFeatureFlag,
  projectClientVisibleFeatureFlags,
  stableRolloutBucket,
  validateDefinition,
};
