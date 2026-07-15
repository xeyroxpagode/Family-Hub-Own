'use strict';

const { assertSafeStructuredData } = require('./dataPrivacy');

const EVENT_NAME_RE = /^[a-z][a-z0-9_]{2,80}$/;
const CORRELATION_RE = /^[A-Za-z0-9._:-]{1,128}$/;

function validateProperty(value, rule, key) {
  if (value === undefined) return;
  if (value === null && rule.nullable) return;
  if (rule.type && typeof value !== rule.type) throw new TypeError(`Telemetry property ${key} must be ${rule.type}.`);
  if (rule.enum && !rule.enum.includes(value)) throw new TypeError(`Telemetry property ${key} is outside its enum.`);
  if (typeof value === 'string' && value.length > (rule.maxLength ?? 128)) {
    throw new TypeError(`Telemetry property ${key} is too long.`);
  }
}

function createTelemetryCatalog() {
  const events = new Map();
  return Object.freeze({
    register(definitions) {
      if (!Array.isArray(definitions)) throw new TypeError('Telemetry definitions must be an array.');
      for (const definition of definitions) {
        if (!EVENT_NAME_RE.test(definition?.name ?? '')) throw new TypeError(`Invalid telemetry event: ${String(definition?.name)}`);
        if (!definition.domain?.trim()) throw new TypeError(`Telemetry event ${definition.name} needs a domain.`);
        if (events.has(definition.name)) throw new TypeError(`Duplicate telemetry event: ${definition.name}`);
        const properties = Object.freeze({ ...(definition.properties ?? {}) });
        events.set(definition.name, Object.freeze({ ...definition, properties }));
      }
    },
    get(name) { return events.get(name) ?? null; },
    list() { return [...events.values()]; },
  });
}

function createNoopTelemetrySink() {
  return Object.freeze({ write: async () => {} });
}

function createTestTelemetrySink() {
  const events = [];
  return {
    events,
    async write(event) { events.push(event); },
    clear() { events.length = 0; },
  };
}

function createConsoleTelemetrySink() {
  return Object.freeze({
    async write(event) {
      console.info('[homeplus.telemetry]', JSON.stringify(event));
    },
  });
}

function createTelemetry({ catalog, sink = createNoopTelemetrySink(), clock = () => new Date() }) {
  if (!catalog) throw new TypeError('Telemetry catalog is required.');
  return Object.freeze({
    async track(eventName, properties = {}, context = {}) {
      const definition = catalog.get(eventName);
      if (!definition) {
        const error = new Error(`Unknown telemetry event: ${eventName}`);
        error.code = 'unknown_telemetry_event';
        throw error;
      }
      if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
        throw new TypeError('Telemetry properties must be an object.');
      }
      assertSafeStructuredData(properties);
      const allowed = definition.properties;
      for (const key of Object.keys(properties)) {
        if (!Object.prototype.hasOwnProperty.call(allowed, key)) {
          const error = new Error(`Telemetry property is not allowed: ${key}`);
          error.code = 'telemetry_property_not_allowed';
          throw error;
        }
        validateProperty(properties[key], allowed[key], key);
      }
      for (const [key, rule] of Object.entries(allowed)) {
        if (rule.required && properties[key] === undefined) throw new TypeError(`Telemetry property ${key} is required.`);
      }

      const correlation = {};
      if (context.requestId && CORRELATION_RE.test(context.requestId)) correlation.request_id = context.requestId;
      if (context.mutationId && CORRELATION_RE.test(context.mutationId)) correlation.mutation_id = context.mutationId;
      const event = Object.freeze({
        event_name: eventName,
        domain: definition.domain,
        occurred_at: clock().toISOString(),
        properties: Object.freeze({ ...properties }),
        correlation: Object.freeze(correlation),
      });
      assertSafeStructuredData(event);
      await sink.write(event);
      return event;
    },
  });
}

module.exports = {
  createConsoleTelemetrySink,
  createNoopTelemetrySink,
  createTelemetry,
  createTelemetryCatalog,
  createTestTelemetrySink,
};
