'use strict';

/**
 * HomePlus Homi Tool Layer — telemetry catalog (T07-S4).
 *
 * Every attempted Homi tool execution emits exactly one `started` event and
 * then exactly one terminal event (`succeeded` or `failed`).
 *
 * The property set is intentionally free of any business content:
 *   - no tool arguments;
 *   - no tool result payload;
 *   - no access token, credential or signed URL;
 *   - only identifiers, a duration and an outcome.
 *
 * The request correlation id is not a property: it travels in the canonical
 * telemetry correlation block, exactly like every other HomePlus event.
 */

const string = (extra = {}) => Object.freeze({ type: 'string', maxLength: 128, ...extra });
const number = Object.freeze({ type: 'number' });

const HOMI_TOOL_IDENTITY_PROPERTIES = Object.freeze({
  tool_id: string(),
  actor_id: string(),
  household_id: string(),
  duration_ms: number,
});

const HOMI_TELEMETRY_EVENTS = Object.freeze([
  {
    name: 'homi.tool.started',
    domain: 'homi',
    properties: {
      ...HOMI_TOOL_IDENTITY_PROPERTIES,
      outcome: string({ enum: ['started'] }),
    },
  },
  {
    name: 'homi.tool.succeeded',
    domain: 'homi',
    properties: {
      ...HOMI_TOOL_IDENTITY_PROPERTIES,
      outcome: string({ enum: ['success'] }),
    },
  },
  {
    name: 'homi.tool.failed',
    domain: 'homi',
    properties: {
      ...HOMI_TOOL_IDENTITY_PROPERTIES,
      outcome: string({ enum: ['failure'] }),
      error_code: string(),
    },
  },
]);

module.exports = { HOMI_TELEMETRY_EVENTS };
