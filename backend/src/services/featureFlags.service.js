'use strict';

const { supabaseAdmin, hasSupabaseAdmin } = require('../config/supabase');
const { featureFlagRegistry } = require('../config/featureFlags');
const { telemetry } = require('../config/telemetry');
const { evaluateFeatureFlag, projectClientVisibleFeatureFlags } = require('../lib/featureFlagRegistry');

function parseBooleanEnvironment(value) {
  return typeof value === 'string' && ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

async function loadOverrides(environment) {
  if (!hasSupabaseAdmin) throw Object.assign(new Error('Feature flag override store is unavailable.'), { code: 'flag_store_unavailable' });
  const keys = featureFlagRegistry.list().map((definition) => definition.key);
  const { data, error } = await supabaseAdmin
    .from('feature_flag_overrides')
    .select('flag_key, environment, scope_type, scope_id, enabled, rollout_percentage, kill_switch, starts_at, ends_at')
    .eq('environment', environment)
    .in('flag_key', keys);
  if (error) throw Object.assign(new Error('Feature flag override lookup failed.'), { code: 'flag_store_failed', cause: error });
  return data ?? [];
}

async function evaluateProjection({ householdId = null, environment, requestId = null, mutationId = null }) {
  const definitions = featureFlagRegistry.list();
  const overrides = await loadOverrides(environment);
  const evaluatedValues = {};
  const globalKillSwitch = parseBooleanEnvironment(process.env.HOMEPLUS_FEATURE_FLAGS_KILL_SWITCH);

  for (const definition of definitions) {
    const evaluation = evaluateFeatureFlag(definition, {
      environment,
      householdId,
      rolloutIdentity: householdId,
      globalKillSwitch,
    }, overrides);
    evaluatedValues[definition.key] = evaluation.enabled;
    await telemetry.track('feature_flag_evaluated', {
      flag_key: definition.key,
      enabled: evaluation.enabled,
      reason: evaluation.reason,
      environment,
    }, { requestId, mutationId });
  }
  return projectClientVisibleFeatureFlags(definitions, evaluatedValues);
}

module.exports = { evaluateProjection, loadOverrides, parseBooleanEnvironment };
