#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function run(label, command, args) {
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
    maxBuffer: 30 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (output) process.stdout.write(output);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${label}: exited with ${result.status ?? result.signal}`);
}

function main() {
  let primaryError = null;
  let resetError = null;
  try {
    run('Event V1 contract suite', process.execPath, ['scripts/planner_m11_2a_event_contract_tests.js']);
    run('full clean reconstruction', 'supabase', ['db', 'reset', '--local', '--no-seed', '--yes']);
    run('Event V1 database suite', process.execPath, ['scripts/planner_m11_2a_event_database_tests.js']);
  } catch (error) {
    primaryError = error;
  } finally {
    try {
      run('final clean reconstruction (always)', 'supabase', ['db', 'reset', '--local', '--no-seed', '--yes']);
      run('post-reset Event backfill report', process.execPath, ['scripts/planner_m11_2a_event_database_tests.js', '--assert-clean']);
    } catch (error) {
      resetError = error;
    }
  }

  if (primaryError || resetError) {
    const reasons = [];
    if (primaryError) reasons.push(`PRIMARY FAILURE:\n${primaryError.stack ?? primaryError}`);
    if (resetError) reasons.push(`FINAL CLEANUP FAILURE:\n${resetError.stack ?? resetError}`);
    throw new Error(reasons.join('\n\n'));
  }
  console.log('\nM11.2A EVENT FOUNDATION RUNNER: PASS');
}

try {
  main();
} catch (error) {
  console.error(`\nM11.2A EVENT FOUNDATION RUNNER: FAIL\n${error.stack ?? error}`);
  process.exitCode = 1;
}
