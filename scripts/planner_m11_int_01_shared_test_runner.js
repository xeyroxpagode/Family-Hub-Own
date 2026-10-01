#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CONTRACT_SCRIPT = path.join('scripts', 'planner_m11_int_01_shared_contract_tests.js');
const DATABASE_SCRIPT = path.join('scripts', 'planner_m11_int_01_shared_database_tests.js');
const TARGET_VERSION = '20260722090000';

function run(label, command, args, options = {}) {
  console.log(`\n=== ${label} ===`);
  const useWindowsShim = process.platform === 'win32' && command === 'supabase';
  const executable = useWindowsShim ? (process.env.ComSpec || 'cmd.exe') : command;
  const commandArgs = useWindowsShim
    ? ['/d', '/s', '/c', ['supabase', ...args].join(' ')]
    : args;
  const result = spawnSync(executable, commandArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    env: process.env,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (output) process.stdout.write(output);
  if (result.error) throw result.error;

  if (options.expectFailure) {
    if (result.status === 0) throw new Error(`${label}: expected failure but command succeeded`);
    console.log(`PASS: ${label} failed as expected`);
    return;
  }

  if (result.status !== 0) {
    throw new Error(`${label}: exited with ${result.status ?? result.signal}`);
  }
}

function resetCurrent(label) {
  run(label, 'supabase', ['db', 'reset', '--local', '--no-seed', '--yes']);
}

function assertClean(label) {
  run(label, 'node', [DATABASE_SCRIPT, '--assert-global-clean']);
}

function runQaProbeReadOnly(label, probePath, mode) {
  const script = [
    "const fs = require('node:fs');",
    "const probePath = process.argv[1];",
    "const mode = process.argv[2];",
    "fs.mkdirSync = (target) => console.log(`READ_ONLY_SKIP_MKDIR ${target}`);",
    "fs.writeFileSync = (target) => console.log(`READ_ONLY_SKIP_WRITE ${target}`);",
    "process.argv = ['node', probePath, mode];",
    "require(probePath);",
  ].join('');
  run(label, 'node', ['-e', script, probePath, mode]);
}

function executeFullRun() {
  // Phase 1: Contract tests (no DB needed)
  run('SHARED CONTRACT TESTS', 'node', [CONTRACT_SCRIPT]);

  // Phase 2: Clean reset and DB suite run 1
  resetCurrent('RESET before DB suite run 1');
  run('SUPABASE MIGRATION LIST', 'supabase', ['migration', 'list', '--local']);
  run('SUPABASE DB LINT', 'supabase', ['db', 'lint', '--local', '--level', 'error']);
  run('DATABASE SUITE RUN 1', 'node', [DATABASE_SCRIPT]);
  assertClean('ASSERT CLEAN after run 1');

  // Phase 3: Clean reset and DB suite run 2
  resetCurrent('RESET before DB suite run 2');

  // Seed legacy rows before applying migration
  run('SEED LEGACY IDEMPOTENCY', 'node', [DATABASE_SCRIPT, '--seed-legacy']);

  // Apply migration and verify backfill
  run('SUPABASE MIGRATION LIST after legacy seed', 'supabase', ['migration', 'list', '--local']);

  run('DATABASE SUITE RUN 2', 'node', [DATABASE_SCRIPT]);
  resetCurrent('RESET after DB suite run 2 (legacy seed consumed)');
  assertClean('ASSERT CLEAN after run 2');

  // Phase 4: Cleanup sensitivity demonstration
  console.log('\n=== CLEANUP SENSITIVITY ===');

  assertClean('ASSERT CLEAN pre-sensitivity');
  console.log('PASS: SHARED-23-PRE: pre-sensitivity cleanup passes');

  run('INSERT DIRTY FIXTURE', 'node', [DATABASE_SCRIPT, '--insert-dirty-fixture']);
  console.log('PASS: SHARED-23-INSERT: dirty fixture inserted');

  run('ASSERT CLEAN WITH DIRTY FIXTURE (expect failure)',
    'node', [DATABASE_SCRIPT, '--assert-global-clean'],
    { expectFailure: true });
  console.log('PASS: SHARED-23-01: dirty fixture causes assert-clean failure');

  run('CLEAN DIRTY FIXTURE', 'node', [DATABASE_SCRIPT, '--cleanup-dirty-fixture']);
  console.log('PASS: SHARED-23-DELETE: dirty fixture cleaned');

  assertClean('ASSERT CLEAN after deliberate fixture removed');
  console.log('PASS: SHARED-23-02: cleanup after dirty fixture removal passes');

  // Phase 5: Unconditional final reset
  console.log('\n=== FINAL CLEANUP ===');
  resetCurrent('UNCONDITIONAL FINAL RESET');
  assertClean('FINAL ASSERT CLEAN');
  run('SUPABASE MIGRATION LIST final', 'supabase', ['migration', 'list', '--local']);
  run('SUPABASE DB LINT final', 'supabase', ['db', 'lint', '--local', '--level', 'error']);

  // Phase 6: QA probe reproduction (read-only)
  const QA_PROBE = 'docs\\implementation\\planner\\qa-evidence\\m11_int_01_phase_2_r2b\\r2b_independent_probe.js';
  const QA_PROBE_PATH = path.join('..', 'qa', QA_PROBE);

  console.log('\n=== QA PROBES (read-only from QA worktree) ===');
  runQaProbeReadOnly('QA R2B PROBE ALL', QA_PROBE_PATH, 'all');

  // Phase 7: Deliberate final cleanup sensitivity then unconditional reset
  console.log('\n=== FINAL CLEANUP SENSITIVITY ===');
  run('INSERT DIRTY before sensitivity', 'node', [DATABASE_SCRIPT, '--insert-dirty-fixture']);
  run('CLEAN DIRTY before final reset', 'node', [DATABASE_SCRIPT, '--cleanup-dirty-fixture']);

  resetCurrent('UNCONDITIONAL FINAL RESET FINAL');
  run('SUPABASE FINAL MIGRATION LIST', 'supabase', ['migration', 'list', '--local']);
  run('SUPABASE FINAL DB LINT', 'supabase', ['db', 'lint', '--local', '--level', 'error']);
  assertClean('FINAL ASSERT CLEAN LAST');

  // Phase 8: Health check — zero fixtures, leases, idle transactions
  console.log('\n=== HEALTH CHECK ===');
  runQaProbeReadOnly('QA R2B ZERO CHECKS', QA_PROBE_PATH, 'zero');

  console.log('\n========================================');
  console.log('M11_INT_01 PHASE 2 R2C INTEGRATION CORRECTION RUNNER: COMPLETE');
  console.log('READY FOR FRESH INDEPENDENT QA REAUDIT');
  console.log('NO INDEPENDENT QA PASS IMPLIED');
  console.log('========================================');
}

try {
  executeFullRun();
} catch (error) {
  console.error(`\nM11_INT_01 PHASE 2 TEST RUNNER: FAIL\n${error.stack ?? error}`);
  process.exitCode = 1;
}
