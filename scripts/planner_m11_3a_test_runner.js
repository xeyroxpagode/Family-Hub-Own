#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function run(label, command, args) {
  console.log(`\n=== ${label} ===`);
  const windowsShim = process.platform === 'win32' && command === 'supabase';
  const executable = windowsShim ? (process.env.ComSpec || 'cmd.exe') : command;
  const commandArgs = windowsShim ? ['/d', '/s', '/c', ['supabase', ...args].join(' ')] : args;
  const result = spawnSync(executable, commandArgs, {
    cwd: ROOT, encoding: 'utf8', shell: false, env: process.env,
    maxBuffer: 30 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (output) process.stdout.write(output);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${label}: exited with ${result.status ?? result.signal}`);
}

function reset(label) {
  run(label, 'supabase', ['db', 'reset', '--local', '--no-seed', '--yes']);
}

function assertClean(label) {
  run(label, 'node', ['scripts/planner_m11_3a_database_tests.js', '--assert-clean']);
}

function runShared(label, command, args) {
  console.log(`\n=== SHARED ${label} ===`);
  const windowsShim = process.platform === 'win32' && command === 'supabase';
  const executable = windowsShim ? (process.env.ComSpec || 'cmd.exe') : command;
  const commandArgs = windowsShim ? ['/d', '/s', '/c', ['supabase', ...args].join(' ')] : args;
  const result = spawnSync(executable, commandArgs, {
    cwd: ROOT, encoding: 'utf8', shell: false, env: process.env,
    maxBuffer: 30 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (output) process.stdout.write(output);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${label}: exited with ${result.status ?? result.signal}`);
}

let primaryError = null;
let cleanupError = null;
try {
  run('M11.3A static contract suite', 'node', ['scripts/planner_m11_3a_contract_tests.js']);
  runShared('CONTRACT TESTS', 'node', ['scripts/planner_m11_int_01_shared_contract_tests.js']);
  reset('M11.3A clean reconstruction');

  run('M11.3A database suite run 1', 'node', ['scripts/planner_m11_3a_database_tests.js']);
  run('M11.3A cleanup iteration 1', 'node', ['scripts/planner_m11_3a_database_tests.js', '--assert-clean']);
  run('M11.3A ten-counter clean gate 1', 'node', ['scripts/planner_m11_3a_database_tests.js', '--assert-clean']);

  run('M11.3A database suite run 2', 'node', ['scripts/planner_m11_3a_database_tests.js']);
  run('M11.3A cleanup iteration 2', 'node', ['scripts/planner_m11_3a_database_tests.js', '--assert-clean']);
  run('M11.3A ten-counter clean gate 2', 'node', ['scripts/planner_m11_3a_database_tests.js', '--assert-clean']);

  runShared('DATABASE SUITE RUN 1', 'node', ['scripts/planner_m11_int_01_shared_database_tests.js']);
  runShared('CLEANUP ITERATION 1', 'node', ['scripts/planner_m11_int_01_shared_database_tests.js', '--assert-global-clean']);
  runShared('DATABASE SUITE RUN 2', 'node', ['scripts/planner_m11_int_01_shared_database_tests.js']);
  runShared('CLEANUP ITERATION 2', 'node', ['scripts/planner_m11_int_01_shared_database_tests.js', '--assert-global-clean']);
} catch (error) {
  primaryError = error;
} finally {
  try { reset('M11.3A final clean reconstruction (always)'); } catch (error) { cleanupError = error; }
  try { assertClean('M11.3A final ten-counter assert-clean'); } catch (error) { cleanupError = cleanupError ?? error; }
  runShared('FINAL DB LINT', 'supabase', ['db', 'lint', '--local', '--level', 'error']);
}

if (primaryError || cleanupError) {
  if (primaryError) console.error(`PRIMARY_FAILURE\n${primaryError.stack ?? primaryError}`);
  if (cleanupError) console.error(`FINAL_RESET_FAILURE\n${cleanupError.stack ?? cleanupError}`);
  process.exitCode = 1;
} else {
  console.log('\nM11.3A SELF-CONTAINED TEST RUNNER: PASS');
}
