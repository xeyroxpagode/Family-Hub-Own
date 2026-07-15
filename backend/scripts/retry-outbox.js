#!/usr/bin/env node
'use strict';

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const { supabaseAdmin } = require('../src/config/supabase');

async function main() {
  const eventId = process.argv[2];
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId ?? '')) {
    throw Object.assign(new Error('A valid event id is required.'), { code: 'invalid_event_id' });
  }
  if (!supabaseAdmin) throw Object.assign(new Error('Service role required.'), { code: 'outbox_admin_required' });
  const { data, error } = await supabaseAdmin.rpc('retry_dead_letter_outbox_event', { p_event_id: eventId });
  if (error) throw error;
  console.log(`OUTBOX_RETRY scheduled=${data === true}`);
}

main().catch((error) => {
  console.error(`OUTBOX_RETRY_FAILED code=${error?.code ?? 'unknown_error'}`);
  process.exitCode = 1;
});
