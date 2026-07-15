#!/usr/bin/env node
'use strict';

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const { supabaseAdmin } = require('../src/config/supabase');

async function main() {
  if (!supabaseAdmin) throw Object.assign(new Error('Service role required.'), { code: 'outbox_admin_required' });
  const statuses = ['pending', 'processing', 'retry', 'processed', 'dead_letter'];
  const counts = {};
  for (const status of statuses) {
    const { count, error } = await supabaseAdmin.from('outbox_events').select('id', { count: 'exact', head: true }).eq('status', status);
    if (error) throw error;
    counts[status] = count ?? 0;
  }
  console.log(`OUTBOX_INSPECT ${statuses.map((status) => `${status}=${counts[status]}`).join(' ')}`);
}

main().catch((error) => {
  console.error(`OUTBOX_INSPECT_FAILED code=${error?.code ?? 'unknown_error'}`);
  process.exitCode = 1;
});
