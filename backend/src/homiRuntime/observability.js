'use strict';

/**
 * HomePlus Homi Tool Layer — tool execution observability (T07-S4).
 *
 * It reuses the current HomePlus telemetry abstraction. No second logging
 * framework is introduced and no event name is invented outside the
 * canonical telemetry catalog.
 *
 * Every attempted tool execution emits:
 *   - `homi.tool.started`  once, before the execution is attempted;
 *   - `homi.tool.succeeded` once, when the tool result is produced;
 *   - `homi.tool.failed`    once, when the execution fails.
 *
 * The emitted metadata is deliberately free of business content: no tool
 * argument, no tool result, no credential and no signed URL. Only
 * identifiers, a duration and an outcome travel.
 */

const { telemetry } = require('../config/telemetry');

const HOMI_TOOL_STARTED = 'homi.tool.started';
const HOMI_TOOL_SUCCEEDED = 'homi.tool.succeeded';
const HOMI_TOOL_FAILED = 'homi.tool.failed';

/**
 * Canonical identifier shape accepted by the telemetry correlation block.
 * An identifier that does not match it is dropped instead of being emitted.
 */
const SAFE_IDENTIFIER_RE = /^[A-Za-z0-9._:-]{1,128}$/;

/**
 * Reduce a value to a safe telemetry identifier.
 *
 * @param {unknown} value the candidate identifier
 * @returns {string|null} the safe identifier or null
 */
function safeIdentifier(value) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!SAFE_IDENTIFIER_RE.test(trimmed)) return null;

  return trimmed;
}

/**
 * Build the safe property set of a tool execution event.
 *
 * @param {object} input the event input
 * @returns {object} the telemetry properties
 */
function buildProperties(input) {
  const properties = {
    tool_id: safeIdentifier(input.toolId) ?? 'unknown',
    duration_ms: Number.isFinite(input.durationMs) && input.durationMs >= 0 ? Math.round(input.durationMs) : 0,
    outcome: input.outcome,
  };

  const actorId = safeIdentifier(input.actorId);
  if (actorId) properties.actor_id = actorId;

  const householdId = safeIdentifier(input.householdId);
  if (householdId) properties.household_id = householdId;

  if (input.errorCode) {
    properties.error_code = safeIdentifier(input.errorCode) ?? 'unknown_error';
  }

  return properties;
}

/**
 * Build the Homi tool observability facade.
 *
 * @param {object} [options] dependency injection
 * @param {object} [options.telemetry] the telemetry instance to use
 * @returns {object} the observability facade
 */
function createHomiObservability(options) {
  const tracker = options && options.telemetry ? options.telemetry : telemetry;

  const emit = async (eventName, input) => {
    try {
      await tracker.track(
        eventName,
        buildProperties(input),
        input.requestId ? { requestId: input.requestId } : {}
      );
    } catch (error) {
      // Observability must never break a tool execution.
    }
  };

  return Object.freeze({
    async started(input) {
      await emit(HOMI_TOOL_STARTED, { ...input, outcome: 'started' });
    },
    async succeeded(input) {
      await emit(HOMI_TOOL_SUCCEEDED, { ...input, outcome: 'success' });
    },
    async failed(input) {
      await emit(HOMI_TOOL_FAILED, { ...input, outcome: 'failure' });
    },
  });
}

const homiObservability = createHomiObservability();

module.exports = {
  HOMI_TOOL_STARTED,
  HOMI_TOOL_SUCCEEDED,
  HOMI_TOOL_FAILED,
  createHomiObservability,
  homiObservability,
  safeIdentifier,
};
