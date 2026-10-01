'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { redact } = require('../helpers/environment');
const { CleanupStack, createRunId, fakeEmail } = require('../helpers/fixtures');

test('run identifiers are unique and contain no credentials', () => {
  const first = createRunId('G0.5 Fixtures');
  const second = createRunId('G0.5 Fixtures');
  assert.notEqual(first, second);
  assert.match(first, /^g0-5-fixtures-\d+-[a-f0-9]{12}$/);
  assert.match(fakeEmail(first, 'child'), /^child-.+@example\.test$/);
});

test('cleanup runs in LIFO order and empties the registry', async () => {
  const cleanup = new CleanupStack();
  const order = [];
  cleanup.defer(async () => order.push('first'));
  cleanup.defer(async () => order.push('second'));
  await cleanup.run();
  assert.deepEqual(order, ['second', 'first']);
  assert.equal(cleanup.size, 0);
});

test('cleanup attempts every callback when one fails', async () => {
  const cleanup = new CleanupStack();
  let finalCleanupRan = false;
  cleanup.defer(async () => { finalCleanupRan = true; });
  cleanup.defer(async () => { throw new Error('fixture cleanup sentinel'); });
  await assert.rejects(cleanup.run(), AggregateError);
  assert.equal(finalCleanupRan, true);
  assert.equal(cleanup.size, 0);
});

test('redaction never returns a complete secret', () => {
  const secret = 'super-secret-value';
  const redacted = redact(secret);
  assert.equal(redacted.includes(secret), false);
  assert.match(redacted, /REDACTED/);
});
