#!/usr/bin/env node
'use strict';

const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { loadTestEnvironment, requireLocalUrl } = require('../helpers/environment');
const { CleanupStack, createRunId } = require('../helpers/fixtures');
const { repositoryRoot, runCommand } = require('../helpers/process');

function selectedSuite() {
  const raw = process.argv.find((argument) => argument.startsWith('--suite='));
  return raw ? raw.slice('--suite='.length) : 'all';
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForHealth(child, baseUrl) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`backend exited before readiness (exit ${child.exitCode})`);
    try {
      const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(750) });
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('backend readiness timeout');
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

async function runG02(environment, runId) {
  const cleanup = new CleanupStack();
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['index.js'], {
    cwd: path.join(repositoryRoot, 'backend'),
    env: {
      ...process.env,
      PORT: String(port),
      HOMEPLUS_ENVIRONMENT: 'test',
      HOMEPLUS_TELEMETRY_SINK: 'noop',
      HOMEPLUS_TEST_RUN_ID: runId,
    },
    stdio: ['ignore', 'ignore', 'inherit'],
    windowsHide: true,
  });
  cleanup.defer(() => stopChild(child));
  try {
    await waitForHealth(child, baseUrl);
    runCommand('G0.2 runtime contracts', 'node', ['scripts/planner_g0_2_runtime_runner.js'], {
      env: { ...process.env, API_BASE_URL: baseUrl, HOMEPLUS_TEST_RUN_ID: runId },
    });
  } finally {
    await cleanup.run();
    environment.cleanup();
  }
}

async function runG04(runId) {
  const port = await freePort();
  runCommand('G0.4 runtime contracts', 'node', ['scripts/homeplus_g0_4_runtime_runner.js'], {
    env: { ...process.env, HOMEPLUS_TEST_PORT: String(port), HOMEPLUS_TEST_RUN_ID: runId },
  });
}

async function main() {
  const suite = selectedSuite();
  if (!['all', 'g0.2', 'g0.4'].includes(suite)) throw new Error(`unknown integration suite: ${suite}`);
  const environment = loadTestEnvironment({
    required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  });
  requireLocalUrl('SUPABASE_URL');
  const runId = createRunId(`integration-${suite}`);
  console.log('INTEGRATION_MODE=LOCAL_WRITE_ISOLATED');
  console.log(`INTEGRATION_SUITE=${suite}`);
  try {
    if (suite === 'all' || suite === 'g0.2') await runG02(environment, runId);
    if (suite === 'all' || suite === 'g0.4') await runG04(runId);
    console.log('FIXTURES_CLEANUP=PASS');
    console.log(`HOMEPLUS INTEGRATION: PASSED (${suite})`);
  } finally {
    environment.cleanup();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message.startsWith('RUNTIME_REQUIRED:') ? message : `INTEGRATION_FAILURE: ${message}`);
  process.exitCode = message.startsWith('RUNTIME_REQUIRED:') ? 2 : 1;
});
