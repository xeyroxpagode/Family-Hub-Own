#!/usr/bin/env node
'use strict';

/**
 * HomeCloud Files — LIFECYCLE V1 purge worker entry point.
 *
 * One pass over the durable purge queue (the canonical command):
 *
 *   npm run purge:process
 *
 * The same worker, invoked directly:
 *
 *   node backend/scripts/process-purges.js
 *
 * Continuous mode (recovery/cron replacement; every pass is one durable
 * claim/lease batch, so the process can be killed at any instant):
 *
 *   npm run purge:process -- --interval=30
 *
 * Companion of the canonical outbox runner (process-outbox.js). The API also
 * kicks one opportunistic batch after each confirmed purge; this script is
 * the authoritative recovery path for crashed leases, backoff retries and
 * operations enqueued while no API call was in flight.
 */

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const { processPurgeBatch } = require('../src/services/homecloudPurgeWorker.service');

/**
 * DESTRUCTIVE-TARGET GUARD. This script removes bytes permanently. A backend
 * deployment runs it against its own stack through its own environment, but a
 * developer machine often carries a backend/.env pointing at a REMOTE
 * project. Refusing to run against anything that is not loopback (unless the
 * operator explicitly allows it) keeps a local cron experiment from ever
 * purging real user files on a deployed database.
 */
function refuseNonLocalTarget() {
  const allowRemote = process.env.HOMECLOUD_PURGE_ALLOW_REMOTE === '1';
  if (allowRemote) return false;
  let hostname;
  try { hostname = new URL(process.env.SUPABASE_URL ?? '').hostname; } catch { hostname = null; }
  if (hostname === '127.0.0.1' || hostname === 'localhost') return false;
  console.error('PURGE_PROCESS_REFUSED code=non_local_target (SUPABASE_URL is not a loopback target;');
  console.error('this script permanently deletes bytes. Set HOMECLOUD_PURGE_ALLOW_REMOTE=1 only in an');
  console.error('environment that is intentionally the purge worker of that stack.)');
  return true;
}

function parseIntervalMs(argv) {
  const match = argv.find((arg) => arg.startsWith('--interval='));
  if (!match) return null;
  const seconds = Number(match.split('=')[1]);
  if (!Number.isFinite(seconds) || seconds < 1) {
    console.error('PURGE_PROCESS_FAILED code=invalid_interval');
    process.exitCode = 1;
    return -1;
  }
  return seconds * 1000;
}

function report(result) {
  const byStatus = new Map();
  for (const item of result.results) byStatus.set(item.status, (byStatus.get(item.status) ?? 0) + 1);
  const summary = [...byStatus.entries()].map(([status, count]) => `${status}=${count}`).join(' ') || 'none';
  console.log(`PURGE_PROCESS claimed=${result.claimed} ${summary}`);
}

async function runOnce() {
  try {
    report(await processPurgeBatch());
  } catch (error) {
    console.error(`PURGE_PROCESS_FAILED code=${error?.code ?? 'unknown_error'}: ${error?.message ?? error}`);
    process.exitCode = 1;
  }
}

const intervalMs = parseIntervalMs(process.argv.slice(2));
if (intervalMs === -1) {
  // invalid --interval: exit non-zero, run nothing
} else if (refuseNonLocalTarget()) {
  process.exitCode = 1;
} else if (intervalMs === null) {
  runOnce();
} else {
  console.log(`PURGE_PROCESS continuous mode: one batch every ${intervalMs / 1000}s (Ctrl+C stops; every batch is durable)`);
  runOnce();
  setInterval(runOnce, intervalMs);
}
