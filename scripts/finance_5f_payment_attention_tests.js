#!/usr/bin/env node
'use strict';

const {
  ATTENTION_REASONS,
  listAttention,
} = require('../backend/src/services/planner.attention.service');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    passCount += 1;
    console.log(`  PASS: ${message}`);
    return;
  }
  failCount += 1;
  console.error(`  FAIL: ${message}`);
}

function equal(actual, expected, message) {
  assert(actual === expected, `${message} expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
}

function dateAdd(dateOnly, days) {
  const [year, month, day] = dateOnly.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

class Query {
  constructor(rows) {
    this.rows = rows;
    this.filters = [];
    this.orders = [];
    this.max = null;
  }

  select() { return this; }
  eq(field, value) { this.filters.push((row) => row[field] === value); return this; }
  neq(field, value) { this.filters.push((row) => row[field] !== value); return this; }
  is(field, value) { this.filters.push((row) => row[field] === value); return this; }
  in(field, values) { this.filters.push((row) => values.includes(row[field])); return this; }
  lte(field, value) { this.filters.push((row) => row[field] <= value); return this; }
  or(expression) {
    const clauses = String(expression).split(',').map((clause) => {
      const [field, op, ...rest] = clause.split('.');
      return { field, op, value: rest.join('.') };
    });
    this.filters.push((row) => clauses.some(({ field, op, value }) => {
      if (op === 'eq') return row[field] === value;
      return false;
    }));
    return this;
  }
  limit(value) { this.max = value; return this; }
  order(field, options = {}) {
    this.orders.push({ field, ascending: options.ascending !== false });
    return this;
  }

  then(resolve, reject) {
    try {
      let data = this.rows.filter((row) => this.filters.every((filter) => filter(row)));
      for (const { field, ascending } of [...this.orders].reverse()) {
        data = [...data].sort((a, b) => {
          const left = a[field] ?? '';
          const right = b[field] ?? '';
          if (left === right) return 0;
          return (left < right ? -1 : 1) * (ascending ? 1 : -1);
        });
      }
      if (this.max !== null) data = data.slice(0, this.max);
      return Promise.resolve({ data, error: null }).then(resolve, reject);
    } catch (error) {
      return Promise.reject(error).then(resolve, reject);
    }
  }
}

function fakeClient(tables) {
  return {
    from(table) {
      return new Query(tables[table] || []);
    },
  };
}

const baseContext = {
  client: null,
  personId: 'person-a',
  householdId: 'household-a',
  membershipId: 'membership-a',
  role: 'adult',
  household: { id: 'household-a', timezone: 'America/Argentina/Buenos_Aires' },
};

function due(overrides = {}) {
  return {
    id: overrides.id || '11111111-1111-4111-8111-111111111111',
    title: overrides.title || 'Internet',
    kind: 'NORMAL',
    currency: overrides.currency || 'ARS',
    expected_amount_known: overrides.expected_amount_known !== undefined ? overrides.expected_amount_known : true,
    expected_amount: overrides.expected_amount !== undefined ? overrides.expected_amount : '25000',
    due_date: overrides.due_date || '2026-08-27',
    status: overrides.status || 'PENDING',
    payment_series_id: overrides.payment_series_id || null,
    financial_context_type: overrides.financial_context_type || 'personal',
    owner_person_id: overrides.owner_person_id !== undefined ? overrides.owner_person_id : 'person-a',
    household_id: overrides.household_id !== undefined ? overrides.household_id : null,
    created_at: overrides.created_at || '2026-08-20T00:00:00.000Z',
    updated_at: overrides.updated_at || '2026-08-20T00:00:00.000Z',
  };
}

function taskFixture() {
  return {
    planner_task_fulfillments: [{
      task_id: '22222222-2222-4222-8222-222222222222',
      responsible_member_id: 'membership-a',
      household_id: 'household-a',
      status: 'awaiting_verification',
      completed_at: '2026-08-27T10:00:00.000Z',
      retired_at: null,
      inactive_at: null,
    }],
    planner_tasks: [{
      id: '22222222-2222-4222-8222-222222222222',
      household_id: 'household-a',
      title: 'Tarea existente',
      due_date: '2026-08-27',
      due_time: null,
      status: 'pending',
      created_by_person_id: 'person-a',
      created_at: '2026-08-20T00:00:00.000Z',
      updated_at: '2026-08-27T10:00:00.000Z',
      trashed_at: null,
    }],
  };
}

function eventFixture() {
  return {
    planner_event_participants: [{
      event_id: '33333333-3333-4333-8333-333333333333',
      person_id: 'person-a',
      rsvp_status: 'pending',
    }],
    planner_events: [{
      id: '33333333-3333-4333-8333-333333333333',
      household_id: 'household-a',
      title: 'Evento existente',
      description: '',
      starts_at: '2026-08-28T12:00:00.000Z',
      ends_at: null,
      status: 'confirmed',
      created_at: '2026-08-20T00:00:00.000Z',
      updated_at: '2026-08-20T00:00:00.000Z',
      trashed_at: null,
    }],
  };
}

function planFixture() {
  return {
    planner_plans: [{
      id: '44444444-4444-4444-8444-444444444444',
      scope: 'household',
      owner_person_id: null,
      created_by_person_id: 'person-a',
      household_id: 'household-a',
      objective: 'Plan existente',
      lifecycle: 'blocked',
      archived_at: null,
      trashed_at: null,
      created_at: '2026-08-20T00:00:00.000Z',
      updated_at: '2026-08-27T08:00:00.000Z',
    }],
  };
}

async function attentionFor(dues, todayDate = '2026-08-27', extraTables = {}) {
  const tables = {
    finance_payment_dues: dues,
    planner_task_fulfillments: [],
    planner_tasks: [],
    planner_event_participants: [],
    planner_events: [],
    planner_plans: [],
    ...extraTables,
  };
  return listAttention({ ...baseContext, client: fakeClient(tables) }, { limit: 100, todayDate });
}

function payments(response) {
  return response.items.filter((item) => item.entityType === 'payment');
}

async function main() {
  const today = '2026-08-27';

  const windowResponse = await attentionFor([
    due({ id: '11111111-1111-4111-8111-111111111101', title: 'Overdue', due_date: dateAdd(today, -1) }),
    due({ id: '11111111-1111-4111-8111-111111111102', title: 'Today', due_date: today }),
    due({ id: '11111111-1111-4111-8111-111111111103', title: 'Tomorrow', due_date: dateAdd(today, 1) }),
    due({ id: '11111111-1111-4111-8111-111111111104', title: 'Two days', due_date: dateAdd(today, 2) }),
    due({ id: '11111111-1111-4111-8111-111111111105', title: 'Three days', due_date: dateAdd(today, 3) }),
    due({ id: '11111111-1111-4111-8111-111111111106', title: 'Four days', due_date: dateAdd(today, 4) }),
  ], today);
  const windowItems = payments(windowResponse);
  equal(windowItems.length, 5, '5F-01 overdue/today/tomorrow/2/3 days appear, 4 days excluded');
  assert(windowItems.some((item) => item.reason === ATTENTION_REASONS.PAYMENT_OVERDUE), '5F-02 overdue PENDING appears');
  assert(windowItems.some((item) => item.reason === ATTENTION_REASONS.PAYMENT_DUE_TODAY), '5F-03 due today appears');
  equal(windowItems.filter((item) => item.reason === ATTENTION_REASONS.PAYMENT_DUE_SOON).length, 3, '5F-04 due soon appears for 1/2/3 days');
  assert(!windowItems.some((item) => item.title === 'Four days'), '5F-05 due in 4 days does not appear');

  const terminalResponse = await attentionFor([
    due({ id: '11111111-1111-4111-8111-111111111107', status: 'PAID', due_date: dateAdd(today, -1) }),
    due({ id: '11111111-1111-4111-8111-111111111108', status: 'CANCELLED', due_date: dateAdd(today, -1) }),
  ], today);
  equal(payments(terminalResponse).length, 0, '5F-06 PAID/CANCELLED never appear');

  const amountResponse = await attentionFor([
    due({ id: '11111111-1111-4111-8111-111111111109', expected_amount_known: true, expected_amount: '25000' }),
    due({ id: '11111111-1111-4111-8111-111111111110', title: 'Gas', expected_amount_known: false, expected_amount: null }),
  ], today);
  assert(payments(amountResponse).some((item) => item.summary.includes('$25.000')), '5F-07 known amount DTO uses human money copy');
  assert(payments(amountResponse).some((item) => item.summary.includes('A confirmar')), '5F-08 unknown amount DTO uses A confirmar');
  assert(!payments(amountResponse).some((item) => item.summary.includes('A confirmar ARS') || item.summary.includes('UNKNOWN')), '5F-09 unknown amount avoids raw/suffixed copy');

  const recurringResponse = await attentionFor([
    due({
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Internet recurrente',
      payment_series_id: '55555555-5555-4555-8555-555555555555',
    }),
  ], today);
  equal(payments(recurringResponse).length, 1, '5F-10 recurring current occurrence appears once');
  equal(payments(recurringResponse)[0].entityId, '11111111-1111-4111-8111-111111111111', '5F-11 entityId is due occurrence, not series');

  const stableSoon = payments(await attentionFor([due({
    id: '11111111-1111-4111-8111-111111111112',
    due_date: dateAdd(today, 3),
  })], today))[0];
  const stableToday = payments(await attentionFor([due({
    id: '11111111-1111-4111-8111-111111111112',
    due_date: dateAdd(today, 3),
  })], dateAdd(today, 3)))[0];
  const stableOverdue = payments(await attentionFor([due({
    id: '11111111-1111-4111-8111-111111111112',
    due_date: dateAdd(today, 3),
  })], dateAdd(today, 4)))[0];
  equal(stableSoon.dedupeKey, stableToday.dedupeKey, '5F-12 dedupeKey stable from due-soon to due-today');
  equal(stableToday.dedupeKey, stableOverdue.dedupeKey, '5F-13 dedupeKey stable from due-today to overdue');
  assert(stableSoon.reason !== stableToday.reason && stableToday.reason !== stableOverdue.reason, '5F-14 reason evolves without identity changing');

  const isolationResponse = await attentionFor([
    due({ id: '11111111-1111-4111-8111-111111111113', title: 'Personal propia' }),
    due({ id: '11111111-1111-4111-8111-111111111114', title: 'Personal ajena', owner_person_id: 'person-b' }),
    due({
      id: '11111111-1111-4111-8111-111111111115',
      title: 'Household activo',
      financial_context_type: 'household',
      owner_person_id: null,
      household_id: 'household-a',
    }),
    due({
      id: '11111111-1111-4111-8111-111111111116',
      title: 'Household ajeno',
      financial_context_type: 'household',
      owner_person_id: null,
      household_id: 'household-b',
    }),
  ], today);
  const isolationTitles = payments(isolationResponse).map((item) => item.title);
  assert(isolationTitles.includes('Personal propia'), '5F-15 Personal owner-only Attention appears');
  assert(!isolationTitles.includes('Personal ajena'), '5F-16 Personal payment does not leak to another person');
  assert(isolationTitles.includes('Household activo'), '5F-17 Household payment appears for active household');
  assert(!isolationTitles.includes('Household ajeno'), '5F-18 other Household payment does not leak');

  const mixedResponse = await attentionFor([
    due({ id: '11111111-1111-4111-8111-111111111117', title: 'Pago mixto' }),
  ], today, {
    ...taskFixture(),
    ...eventFixture(),
    ...planFixture(),
  });
  const entityTypes = new Set(mixedResponse.items.map((item) => item.entityType));
  assert(entityTypes.has('payment') && entityTypes.has('task') && entityTypes.has('event') && entityTypes.has('plan'), '5F-19 mixed Attention aggregation preserves payment/task/event/plan');
  equal(mixedResponse.total, mixedResponse.items.length, '5F-20 Attention count derives from unified item list');

  const firstRead = await attentionFor([due({ id: '11111111-1111-4111-8111-111111111118' })], today);
  const secondRead = await attentionFor([due({ id: '11111111-1111-4111-8111-111111111118' })], today);
  equal(payments(firstRead).length, 1, '5F-21 refresh read has one payment item');
  equal(payments(secondRead).length, 1, '5F-22 second refresh read does not duplicate');
  equal(payments(firstRead)[0].dedupeKey, payments(secondRead)[0].dedupeKey, '5F-23 refresh keeps stable dedupeKey');

  const paidStale = await attentionFor([due({ id: '11111111-1111-4111-8111-111111111119', status: 'PAID' })], today);
  const cancelledStale = await attentionFor([due({ id: '11111111-1111-4111-8111-111111111120', status: 'CANCELLED' })], today);
  equal(payments(paidStale).length, 0, '5F-24 stale paid item disappears on next read');
  equal(payments(cancelledStale).length, 0, '5F-25 stale cancelled item disappears on next read');

  console.log(`\nFINANCE_5F_PAYMENT_ATTENTION_RESULT pass=${passCount} fail=${failCount}`);
  console.log(failCount === 0 ? 'FINANCE_STAGE_5F_PAYMENT_ATTENTION_TESTS=PASS' : 'FINANCE_STAGE_5F_PAYMENT_ATTENTION_TESTS=FAIL');
  if (failCount > 0) process.exit(1);
}

main().catch((error) => {
  console.error('FINANCE_STAGE_5F_PAYMENT_ATTENTION_TESTS=ERROR');
  console.error(error);
  process.exit(1);
});
