'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repositoryRoot = path.resolve(__dirname, '../..');

function executable(name) {
  if (process.platform !== 'win32') return name;
  if (name === 'npm' || name === 'npx') return `${name}.cmd`;
  return name;
}

function commandInvocation(command, args) {
  if (command === 'npm' && process.env.npm_execpath) {
    return { command: process.execPath, args: [process.env.npm_execpath, ...args] };
  }
  return { command: executable(command), args };
}

function runCommand(label, command, args = [], options = {}) {
  console.log(`\n=== ${label} ===`);
  const startedAt = Date.now();
  const invocation = commandInvocation(command, args);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: options.cwd || repositoryRoot,
    env: options.env || process.env,
    stdio: options.stdio || 'inherit',
    encoding: options.encoding,
    windowsHide: true,
  });
  const durationMs = Date.now() - startedAt;
  if (result.error) {
    const error = new Error(`${label} could not start: ${result.error.code || 'unknown_error'}`);
    error.cause = result.error;
    throw error;
  }
  const exitCode = result.status ?? 1;
  console.log(`RESULT: ${label} exit=${exitCode} duration_ms=${durationMs}`);
  if (exitCode !== 0 && !options.allowFailure) {
    const error = new Error(`${label} failed with exit code ${exitCode}`);
    error.exitCode = exitCode;
    throw error;
  }
  return { ...result, exitCode, durationMs };
}

module.exports = { executable, repositoryRoot, runCommand };
