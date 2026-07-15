'use strict';

const EVENT_TYPE_RE = /^[a-z][a-z0-9_.]{2,127}$/;

function createOutboxHandlerRegistry() {
  const handlers = new Map();
  return Object.freeze({
    register(eventType, handler) {
      if (!EVENT_TYPE_RE.test(eventType)) throw new TypeError(`Invalid outbox event type: ${eventType}`);
      if (typeof handler !== 'function') throw new TypeError(`Handler for ${eventType} must be a function.`);
      if (handlers.has(eventType)) throw new TypeError(`Duplicate outbox handler: ${eventType}`);
      handlers.set(eventType, handler);
    },
    get(eventType) { return handlers.get(eventType) ?? null; },
    list() { return [...handlers.keys()]; },
  });
}

const outboxHandlerRegistry = createOutboxHandlerRegistry();

module.exports = { createOutboxHandlerRegistry, outboxHandlerRegistry };
