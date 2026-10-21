'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getPlanComponents } = require('../backend/src/services/planner.plan-components.service');

const PLAN_ID = '00000000-0000-4000-8000-000000000001';
const HOUSEHOLD_ID = '00000000-0000-4000-8000-000000000002';

function query(result) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    is: () => builder,
    neq: () => builder,
    order: () => builder,
    maybeSingle: () => Promise.resolve(result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

test('Plan component reader uses planner_tasks.trashed_at and returns linked task/event payloads', async () => {
  const calls = [];
  const client = {
    from(table) {
      calls.push(table);
      if (table === 'planner_goals') {
        return query({ data: { id: PLAN_ID, household_id: HOUSEHOLD_ID, deleted_at: null }, error: null });
      }
      if (table === 'planner_tasks') {
        return query({ data: [{ id: 'task-1', title: 'Task', status: 'pending' }], error: null });
      }
      return query({ data: [{ id: 'event-1', title: 'Event', status: 'scheduled' }], error: null });
    },
  };

  const result = await getPlanComponents({ client, householdId: HOUSEHOLD_ID }, PLAN_ID);
  assert.deepEqual(result, {
    tasks: [{ id: 'task-1', title: 'Task', status: 'pending' }],
    events: [{ id: 'event-1', title: 'Event', status: 'scheduled' }],
  });
  assert.deepEqual(calls, ['planner_goals', 'planner_tasks', 'planner_events']);
});

test('Plan component reader maps schema drift to the safe planner diagnostic error', async () => {
  const client = {
    from(table) {
      if (table === 'planner_goals') {
        return query({ data: { id: PLAN_ID, household_id: HOUSEHOLD_ID, deleted_at: null }, error: null });
      }
      if (table === 'planner_tasks') {
        return query({ data: null, error: { code: '42703', message: 'column planner_tasks.deleted_at does not exist' } });
      }
      return query({ data: [], error: null });
    },
  };

  await assert.rejects(
    () => getPlanComponents({ client, householdId: HOUSEHOLD_ID }, PLAN_ID),
    (error) => error.statusCode === 500 && error.code === 'planner_schema_mismatch' && error.internalCode === '42703',
  );
});
