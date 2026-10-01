import { removeById, upsertById } from '../front/mi-front-limpio/services/core/collectionState.js';
import { createServerState } from '../front/mi-front-limpio/services/core/serverState.js';

let failures = 0;

function assert(condition: unknown, message: string): void {
  if (condition) {
    console.log(`PASS: ${message}`);
    return;
  }
  failures += 1;
  console.error(`FAIL: ${message}`);
}

const initial = [
  { id: 'item-a', value: 1 },
  { id: 'item-b', value: 2 },
];
const updated = upsertById(initial, { id: 'item-a', value: 3 });
assert(updated !== initial, 'upsert returns a new collection reference');
assert(initial[0].value === 1, 'upsert does not mutate the previous item collection');
assert(updated[0].value === 3 && updated.length === 2, 'upsert replaces exactly the matching entity');

const removed = removeById(updated, 'item-b');
assert(removed !== updated, 'remove returns a new collection reference');
assert(updated.length === 2, 'remove does not mutate the previous collection');
assert(removed.length === 1 && removed[0].id === 'item-a', 'remove deletes only the requested entity');

const state = createServerState();
const key = ['reactive-ui', 'item-a'] as const;
let notifications = 0;
const unsubscribe = state.subscribe(() => { notifications += 1; });
state.set(key, { id: 'item-a', value: 1 });
const beforePatch = state.getEntry<{ id: string; value: number }>(key);
state.applyOptimisticPatch<{ id: string; value: number }>([key], (current) =>
  current ? { ...current, value: 2 } : current,
);
const afterPatch = state.getEntry<{ id: string; value: number }>(key);
unsubscribe();

assert(notifications === 2, 'cache notifies consumers for canonical and optimistic writes');
assert(beforePatch !== afterPatch, 'optimistic patch publishes a new observable entry');
assert(beforePatch?.data?.value === 1 && afterPatch?.data?.value === 2, 'optimistic patch preserves the previous snapshot and updates the next one');

const unrelatedKey = ['reactive-ui', 'item-b'] as const;
let relatedNotifications = 0;
let unrelatedNotifications = 0;
const stopRelated = state.subscribeKey(key, () => { relatedNotifications += 1; });
const stopUnrelated = state.subscribeKey(unrelatedKey, () => { unrelatedNotifications += 1; });
state.set(key, { id: 'item-a', value: 3 });
stopRelated();
stopUnrelated();
assert(relatedNotifications === 1, 'a key consumer is notified for its own update');
assert(unrelatedNotifications === 0, 'an unrelated key consumer is not notified for another key update');

if (failures > 0) process.exitCode = 1;
else console.log('REACTIVE UI STATE TESTS PASSED');
