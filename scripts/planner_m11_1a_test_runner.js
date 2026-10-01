#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DATABASE_SCRIPT = path.join('scripts', 'planner_m11_1a_database_tests.js');
const PRE_M11_VERSION = '20260715010000';
const TARGET_VERSION = '20260722010000';
const FAIL_AFTER = process.env.M11_1A_TEST_FAIL_AFTER ?? null;

const INVALID_SCENARIOS = Object.freeze([
  ['creator-unmappable', 'creator member/person is required'],
  ['assignee-cross-household', 'assigned member belongs to another household'],
  ['completion-cross-household', 'completion member belongs to another household'],
  ['verification-cross-household', 'verification member belongs to another household'],
  ['cancellation-cross-household', 'cancellation member belongs to another household'],
  ['trash-cross-household', 'trash member belongs to another household'],
  ['member-person-mismatch', 'completion member/person mismatch'],
  ['pending-terminal-metadata', 'pending task has terminal metadata'],
  ['completed-inconsistent', 'completed task is inconsistent'],
  ['awaiting-verification-inconsistent', 'awaiting_verification task is inconsistent'],
  ['verified-inconsistent', 'verified task is inconsistent'],
  ['cancelled-inconsistent', 'cancelled task is inconsistent'],
]);

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
    if (options.includes && !output.includes(options.includes)) {
      throw new Error(`${label}: failure did not contain ${JSON.stringify(options.includes)}`);
    }
    console.log(`PASS: ${label} failed with the expected preflight blocker`);
    return;
  }

  if (result.status !== 0) {
    throw new Error(`${label}: exited with ${result.status ?? result.signal}`);
  }
}

function resetBeforeM11(label) {
  run(label, 'supabase', [
    'db', 'reset', '--local', '--version', PRE_M11_VERSION, '--no-seed', '--yes',
  ]);
}

function resetCurrent(label) {
  run(label, 'supabase', ['db', 'reset', '--local', '--no-seed', '--yes']);
}

function failAfter(stage) {
  if (FAIL_AFTER === stage) {
    throw new Error(`M11.1A deterministic test failure after ${stage}`);
  }
}

function migrateExpectingBlock(kind, expectedMessage) {
  run(`seed invalid legacy scenario: ${kind}`, 'node', [DATABASE_SCRIPT, `--seed-invalid=${kind}`]);
  failAfter('invalid-fixture-seeded');
  run(
    `M11.1A preflight blocks invalid legacy scenario: ${kind}`,
    'supabase', ['migration', 'up', '--local'],
    { expectFailure: true, includes: expectedMessage },
  );
  resetBeforeM11(`cleanup reset after invalid legacy scenario: ${kind}`);
  run(`assert invalid fixture cleanup: ${kind}`, 'node', [DATABASE_SCRIPT, '--assert-invalid-clean']);
}

function mainBody() {
  resetBeforeM11('initial reset before invalid legacy scenarios');
  for (const [kind, expectedMessage] of INVALID_SCENARIOS) {
    migrateExpectingBlock(kind, expectedMessage);
  }

  run('seed valid legacy backfill', 'node', [DATABASE_SCRIPT, '--seed-legacy']);
  run('apply M11.1A over valid legacy data', 'supabase', ['migration', 'up', '--local']);
  run('assert valid legacy backfill and cleanup', 'node', [DATABASE_SCRIPT, '--assert-backfill']);
  failAfter('valid-backfill');

  resetCurrent('full clean reconstruction before database suite run 1');
  run('M11.1A database suite run 1', 'node', [DATABASE_SCRIPT]);
  failAfter('database-suite-1');
  resetCurrent('full clean reconstruction before database suite run 2');
  run('M11.1A database suite run 2', 'node', [DATABASE_SCRIPT]);
  failAfter('database-suite-2');
}

function executeWithGuaranteedReset() {
  let primaryError = null;
  let resetError = null;
  try {
    mainBody();
  } catch (error) {
    primaryError = error;
  } finally {
    try {
      resetCurrent('final clean reconstruction (always)');
    } catch (error) {
      resetError = error;
    }
  }

  if (primaryError || resetError) {
    const parts = [];
    if (primaryError) parts.push(`PRIMARY FAILURE:\n${primaryError.stack ?? primaryError}`);
    if (resetError) parts.push(`FINAL RESET FAILURE:\n${resetError.stack ?? resetError}`);
    const combined = new Error(parts.join('\n\n'));
    combined.cause = primaryError ?? resetError;
    throw combined;
  }

  console.log('\nM11.1A SELF-CONTAINED DATABASE RUNNER: PASS');
}

function verifyFailurePath() {
  console.log('\n=== automated deterministic failure-path verification ===');
  const result = spawnSync(process.execPath, [__filename], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, M11_1A_TEST_FAIL_AFTER: 'invalid-fixture-seeded' },
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (output) process.stdout.write(output);
  if (result.error) throw result.error;
  if (result.status === 0) throw new Error('failure-path child unexpectedly succeeded');
  if (!output.includes('M11.1A deterministic test failure after invalid-fixture-seeded')) {
    throw new Error('failure-path child did not preserve the original deterministic cause');
  }
  if (!output.includes('final clean reconstruction (always)')) {
    throw new Error('failure-path child did not attempt the unconditional final reset');
  }
  run('assert clean database after controlled failure', 'node', [DATABASE_SCRIPT, '--assert-global-clean']);
  run('assert migration list after controlled failure', 'supabase', ['migration', 'list', '--local']);
  run('assert target migration in catalog after controlled failure', 'node', [DATABASE_SCRIPT, '--assert-global-clean']);
  console.log(`\nM11.1A RUNNER FAILURE PATH: PASS (${TARGET_VERSION} applied, fixtures clean)`);
}

try {
  if (process.argv.includes('--verify-failure-path')) {
    verifyFailurePath();
  } else {
    executeWithGuaranteedReset();
  }
} catch (error) {
  console.error(`\nM11.1A SELF-CONTAINED DATABASE RUNNER: FAIL\n${error.stack ?? error}`);
  process.exitCode = 1;
}
