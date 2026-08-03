#!/usr/bin/env node
'use strict';
const { Client } = require('C:\\Users\\thega\\Desktop\\HomePlus\\backend\\node_modules\\pg');
async function main() {
  const c = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres', connectionTimeoutMillis: 5000, statement_timeout: 15000 });
  await c.connect();
  try {
    // Test cases designed to isolate the bytea cast problem.
    const vectors = [
      { label: 'ascii_payload', payload: { s: 'a' } },
      { label: 'latin1_acute_a', payload: { s: 'á' } },           // U+00E1
      { label: 'spanish_n', payload: { s: 'ñ' } },                // U+00F1
      { label: 'emoji_rocket', payload: { s: '🚀' } },            // U+1F680 (4-byte UTF8)
      { label: 'nul_in_array', payload: { arr: ['x', null] } },
      { label: 'backslash_string', payload: { s6: 'invicta\\backslash' } },
      { label: 'escaped_quote_string', payload: { s4: 'a"b"c' } },
      { label: 'newline_string', payload: { s3: 'line\nbreak' } },
    ];
    for (const v of vectors) {
      try {
        const r = await c.query(
          `select public.planner_canonical_request_text_v2(
             'op.u','personal','00000000-0000-0000-0000-000000000014'::uuid,
             null::uuid, $1::jsonb, null::integer, 'mut.u'::text
           ) as canonical_text,
           public.planner_canonical_request_hash_v2(
             'op.u','personal','00000000-0000-0000-0000-000000000014'::uuid,
             null::uuid, $1::jsonb, null::integer, 'mut.u'::text
           ) as sql_hash`,
          [JSON.stringify(v.payload)],
        );
        console.log(JSON.stringify({ label: v.label, canonical: r.rows[0].canonical_text, hash: r.rows[0].sql_hash }));
      } catch (e) {
        console.log(JSON.stringify({ label: v.label, error: e.code, message: e.message }));
      }
    }
  } finally { await c.end(); }
}
main().catch((e) => { console.error(e.stack); process.exit(1); });
