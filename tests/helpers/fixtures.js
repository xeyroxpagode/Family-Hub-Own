'use strict';

const crypto = require('node:crypto');

function createRunId(label = 'homeplus') {
  const safeLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'homeplus';
  return `${safeLabel}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
}

function fakeEmail(runId, actor = 'qa') {
  const safeActor = actor.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `${safeActor}-${runId}@example.test`;
}

class CleanupStack {
  #callbacks = [];

  defer(callback) {
    if (typeof callback !== 'function') throw new TypeError('cleanup callback must be a function');
    this.#callbacks.push(callback);
  }

  async run() {
    const failures = [];
    while (this.#callbacks.length) {
      const callback = this.#callbacks.pop();
      try {
        await callback();
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length) throw new AggregateError(failures, `fixture cleanup produced ${failures.length} error(s)`);
  }

  get size() {
    return this.#callbacks.length;
  }
}

module.exports = { CleanupStack, createRunId, fakeEmail };
