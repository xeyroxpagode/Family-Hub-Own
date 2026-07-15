'use strict';

const string = (extra = {}) => Object.freeze({ type: 'string', maxLength: 128, ...extra });
const boolean = Object.freeze({ type: 'boolean' });

const PLANNER_TELEMETRY_EVENTS = Object.freeze([
  {
    name: 'planner_capabilities_loaded',
    domain: 'planner',
    properties: { result: string({ enum: ['success', 'failure'] }) },
  },
  {
    name: 'planner_mutation_succeeded',
    domain: 'planner',
    properties: { action: string(), entity_kind: string({ enum: ['task', 'event', 'goal', 'milestone'] }), audited: boolean },
  },
  {
    name: 'planner_mutation_failed',
    domain: 'planner',
    properties: { action: string(), entity_kind: string({ enum: ['task', 'event', 'goal', 'milestone'] }), error_code: string() },
  },
  {
    name: 'planner_search_opened',
    domain: 'planner',
    properties: { source: string() },
    reserved: true,
  },
]);

module.exports = { PLANNER_TELEMETRY_EVENTS };
