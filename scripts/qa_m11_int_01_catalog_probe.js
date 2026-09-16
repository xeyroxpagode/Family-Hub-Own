const { Client } = require('C:\\Users\\thega\\Desktop\\HomePlus\\backend\\node_modules\\pg');
const DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
async function main() {
  const client = new Client({connectionString: DATABASE_URL, connectionTimeoutMillis: 5000, statement_timeout: 15000});
  await client.connect();
  try {
    const v2Helpers = ['planner_v2_reserve_idempotency','planner_v2_complete_idempotency','planner_v2_recover_idempotency','planner_v2_append_audit','planner_canonical_request_hash_v2'];
    for (const h of v2Helpers) {
      const r = await client.query("select prosecdef, proacl::text as acl, proname from pg_proc where proname=$1 and pronamespace='public'::regnamespace", [h]);
      if (r.rows.length > 0) {
        const row = r.rows[0];
        console.log(h + ' | SECURITY_DEFINER=' + row.prosecdef + ' | ACL=' + (row.acl || 'NULL'));
      } else { console.log(h + ' | NOT_FOUND'); }
    }
    const legacyRPCs = ['reserve_planner_idempotency_key','complete_planner_idempotency_key'];
    for (const h of legacyRPCs) {
      const r = await client.query("select prosecdef, proacl::text as acl from pg_proc where proname=$1 and pronamespace='public'::regnamespace", [h]);
      if (r.rows.length > 0) {
        console.log(h + ' | ACL=' + (r.rows[0].acl || 'NULL'));
      } else { console.log(h + ' | NOT_FOUND'); }
    }
    const m = await client.query("select count(*)::int from supabase_migrations.schema_migrations where version='20260722090000'");
    console.log('20260722090000 count in schema_migrations: ' + m.rows[0].count);
    const cols = await client.query("select column_name from information_schema.columns where table_schema='public' and table_name='planner_idempotency_keys' order by ordinal_position");
    console.log('planner_idempotency_keys columns: ' + cols.rows.map(r => r.column_name).join(', '));
    const empty = await client.query("select count(*)::int from public.planner_idempotency_keys");
    console.log('planner_idempotency_keys rows: ' + empty.rows[0].count);
    const audit = await client.query("select count(*)::int from public.audit_events");
    console.log('audit_events rows: ' + audit.rows[0].count);
  } finally { await client.end(); }
}
main().catch(e => { console.error(e); process.exit(1); });