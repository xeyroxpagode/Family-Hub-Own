#!/usr/bin/env node
'use strict';

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const { processOutboxBatch } = require('../src/services/outboxProcessor.service');

processOutboxBatch()
  .then((result) => {
    console.log(`OUTBOX_PROCESS claimed=${result.claimed} processed=${result.results.filter((item) => item.status === 'processed').length} retry=${result.results.filter((item) => item.status === 'retry').length} dead_letter=${result.results.filter((item) => item.status === 'dead_letter').length}`);
  })
  .catch((error) => {
    console.error(`OUTBOX_PROCESS_FAILED code=${error?.code ?? 'unknown_error'}`);
    process.exitCode = 1;
  });
