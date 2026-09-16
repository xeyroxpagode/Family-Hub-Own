#!/usr/bin/env node
'use strict';

const { Client } = require('C:\\Users\\thega\\Desktop\\HomePlus\\backend\\node_modules\\pg');

const DATABASE_URL = process.env.LOCAL_DATABASE_URL
  || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const parsed = new URL(DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
  console.error('ENVIRONMENT_FAILURE: local PostgreSQL only');
  process.exit(1);
}

const checks = [
  ['idempotency fixtures', 'select count(*)::int as count from public.planner_idempotency_keys'],
  ['leases', 'select count(*)::int as count from public.planner_idempotency_keys where lease_token is not null or lease_expiry is not null'],
  ['QA tables', "select count(*)::int as count from information_schema.tables where table_schema='public' and table_name like 'm11_int_01_qa_r2c_%'"],
  ['QA functions', "select count(*)::int as count from pg_proc where pronamespace='public'::regnamespace and proname like 'm11_int_01_qa_r2c_%'"],
  ['temp relations', "select count(*)::int as count from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname like 'pg_temp_%' and c.relkind in ('r','p','v','m','f')"],
  ['idle transactions', "select count(*)::int as count from pg_stat_activity where datname = current_database() and state = 'idle in transaction'"],
];

async function main() {
  const client = new Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: 5000 });
  await client.connect();
  let failures = 0;
  try {
    for (const [label, query] of checks) {
      const count = (await client.query(query)).rows[0].count;
      const ok = count === 0;
      console.log(`${ok ? 'PASS' : 'FAIL'}: ${label} = ${count}`);
      if (!ok) failures += 1;
    }
  } finally {
    await client.end();
  }
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
