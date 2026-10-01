#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DB_SCRIPT = path.join('scripts', 'planner_m11_1b_database_tests.js');
const CONTRACT_SCRIPT = path.join('scripts', 'planner_m11_1b_contract_tests.js');
const HTTP_SCRIPT = path.join('scripts', 'planner_m11_1b_http_tests.js');
const FAIL_AFTER = process.env.M11_1B_TEST_FAIL_AFTER ?? null;

function run(label, command, args, options = {}) {
  console.log(`\n=== ${label} ===`);
  const useWindowsShim = process.platform === 'win32' && command === 'supabase';
  const executable = useWindowsShim ? (process.env.ComSpec || 'cmd.exe') : command;
  const commandArgs = useWindowsShim ? ['/d', '/s', '/c', ['supabase', ...args].join(' ')] : args;
  const result = spawnSync(executable, commandArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 20 * 1024 * 1024,
    env: options.env ?? process.env,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (output) process.stdout.write(output);
  if (result.error) throw result.error;
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`${label}: exited with ${result.status ?? result.signal}`);
  }
  return { ...result, output };
}

function resetAndVerify(label) {
  const reset = run(label, 'supabase', ['db', 'reset', '--local', '--no-seed', '--yes'], { allowFailure: true });
  run(`${label}: verify target migration and clean fixtures`, process.execPath, [DB_SCRIPT, '--assert-clean']);
  const migrations = run(`${label}: migration list`, 'supabase', ['migration', 'list', '--local']);
  if (!migrations.output.includes('20260722020000')) throw new Error(`${label}: target migration missing from local list`);
  if (reset.status !== 0) {
    const sqlCompleted = [
      'Recreating database...',
      'Applying migration 20260722010000_m11_1a_task_fulfillment_foundation.sql...',
      'Applying migration 20260722020000_m11_1b_task_fulfillment_operations.sql...',
      'Restarting containers...',
    ].every((marker) => reset.output.includes(marker));
    if (!sqlCompleted) throw new Error(`${label}: reset failed before demonstrable SQL reconstruction`);
    run(`${label}: local services status after post-health failure`, 'supabase', ['status']);
    run(`${label}: REST connectivity after post-health failure`, process.execPath, ['-e',
      "fetch('http://127.0.0.1:54321/rest/v1/').then(r=>{if(r.status>=500)process.exit(1);console.log('REST_HEALTH_STATUS='+r.status)}).catch(()=>process.exit(1))",
    ]);
    console.warn(`${label}: accepted a diagnosed post-health CLI failure after complete SQL reconstruction.`);
  }
}

function failAfter(stage) {
  if (FAIL_AFTER === stage) throw new Error(`M11.1B deterministic test failure after ${stage}`);
}

function directedGates() {
  run('M11.1B real database suite', process.execPath, [DB_SCRIPT]);
  failAfter('database-suite');
  run('M11.1B behavioral HTTP/idempotency suite', process.execPath, [HTTP_SCRIPT]);
  run('M11.1B API/DTO/frontend contract suite', process.execPath, [CONTRACT_SCRIPT]);
  run('M11.1A directed compatibility contract gate', process.execPath, [path.join('scripts', 'planner_m11_1a_contract_tests.js')]);
}

function mainBody() {
  resetAndVerify('M11.1B initial complete local reset');
  directedGates();
}

const noReset = process.argv.includes('--no-reset');

function verifyFailurePath() {
  const cleanupFailure = run(
    'M11.1B deterministic cleanup failure child',
    process.execPath,
    [DB_SCRIPT],
    { allowFailure: true, env: { ...process.env, M11_1B_TEST_FORCE_CLEANUP_FAILURE: '1' } },
  );
  if (cleanupFailure.status === 0 || !cleanupFailure.output.includes('M11.1B deterministic cleanup failure')) {
    throw new Error('cleanup failure-path child did not fail with the deterministic cleanup cause');
  }
  run('M11.1B cleanup failure child left no fixtures', process.execPath, [DB_SCRIPT, '--assert-clean']);

  const child = spawnSync(process.execPath, [__filename], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, M11_1B_TEST_FAIL_AFTER: 'database-suite' },
  });
  const output = `${child.stdout ?? ''}${child.stderr ?? ''}`;
  if (output) process.stdout.write(output);
  if (child.status === 0 || !output.includes('M11.1B deterministic test failure after database-suite')) {
    throw new Error('runner failure-path child did not preserve the primary deterministic cause');
  }
  if (!output.includes('M11.1B final complete local reset (always)')) {
    throw new Error('runner failure-path child did not attempt the unconditional final reset');
  }
  run('M11.1B failure-path final clean verification', process.execPath, [DB_SCRIPT, '--assert-clean']);
  console.log('\nM11.1B RUNNER FAILURE PATH: PASS');
}

let primaryError = null;
let resetError = null;
try {
  if (process.argv.includes('--verify-failure-path')) {
    verifyFailurePath();
  } else if (noReset) {
    run('M11.1B pre-run clean catalog verification', process.execPath, [DB_SCRIPT, '--assert-clean']);
    directedGates();
  } else {
    mainBody();
  }
} catch (error) {
  primaryError = error;
} finally {
  try {
    if (noReset) {
      run('M11.1B final cleanup verification (always)', process.execPath, [DB_SCRIPT, '--assert-clean']);
    } else {
      resetAndVerify('M11.1B final complete local reset (always)');
    }
  } catch (error) { resetError = error; }
}

if (primaryError || resetError) {
  if (primaryError) console.error(`PRIMARY FAILURE:\n${primaryError.stack ?? primaryError}`);
  if (resetError) console.error(`FINAL RESET FAILURE:\n${resetError.stack ?? resetError}`);
  console.error('\nM11.1B SELF-CONTAINED RUNNER: FAIL');
  process.exitCode = 1;
} else {
  console.log('\nM11.1B SELF-CONTAINED RUNNER: PASS');
}
