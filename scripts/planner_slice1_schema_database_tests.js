#!/usr/bin/env node
'use strict';

// Slice 1 schema-drift tripwire. Critical Plan readers must use columns that
// physically exist in the local Planner schema; this specifically prevents a
// recurrence of planner_tasks.deleted_at -> production 500.
const { Client } = require('../backend/node_modules/pg');

const databaseUrl = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:56222/postgres';
const requiredColumns = {
  planner_tasks: ['id', 'goal_id', 'trashed_at', 'plan_classification', 'version', 'created_at'],
  planner_events: ['id', 'goal_id', 'trashed_at', 'plan_classification', 'version', 'created_at'],
  planner_goals: ['id', 'household_id', 'deleted_at'],
};

async function main() {
  const parsed = new URL(databaseUrl);
  if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) {
    throw new Error('Slice 1 schema test only permits a local database');
  }
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    const { rows } = await client.query(`
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = any($1::text[])
    `, [Object.keys(requiredColumns)]);
    const columns = new Map();
    for (const row of rows) {
      if (!columns.has(row.table_name)) columns.set(row.table_name, new Set());
      columns.get(row.table_name).add(row.column_name);
    }
    for (const [table, expected] of Object.entries(requiredColumns)) {
      for (const column of expected) {
        if (!columns.get(table)?.has(column)) throw new Error(`Missing critical Plan reader column ${table}.${column}`);
        console.log(`PASS: ${table}.${column} exists`);
      }
    }
    if (columns.get('planner_tasks')?.has('deleted_at')) {
      throw new Error('planner_tasks.deleted_at unexpectedly exists; the reader contract must use trashed_at');
    }
    console.log('PASS: planner_tasks.deleted_at is absent and cannot be used by the Plan component reader');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
