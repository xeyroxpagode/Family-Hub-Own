#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { repositoryRoot, runCommand } = require('./helpers/process');

const frontend = 'front/mi-front-limpio';
const frontendRoot = path.join(repositoryRoot, frontend);
const backendRoot = path.join(repositoryRoot, 'backend');
const compileFrontendTests = ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.test.json'];

const commands = {
  'backend-syntax': () => runCommand('Backend/test syntax', 'node', ['tests/static/backend-syntax.js']),
  'backend-eslint': () => runCommand('Backend ESLint', 'npm', ['exec', 'eslint', '--', '.'], { cwd: backendRoot }),
  'frontend-lint': () => runCommand('Frontend ESLint', 'npm', ['run', 'lint'], { cwd: frontendRoot }),
  'frontend-typecheck': () => runCommand('Frontend TypeScript', 'npm', ['exec', 'tsc', '--', '--noEmit'], { cwd: frontendRoot }),
  'test-typecheck': () => runCommand('Test TypeScript', 'npm', ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.test.json', '--noEmit']),
  'testing-core': () => runCommand('Testing Core unit tests', 'node', ['--test', 'tests/core/testing-core.test.js']),
  'core-backend': () => runCommand('Core backend contracts', 'node', ['scripts/homeplus_core_contract_tests.js']),
  'compile-frontend-tests': () => runCommand('Compile frontend tests', 'npm', compileFrontendTests),
  'core-frontend': () => runCommand('Core frontend contracts', 'node', ['scripts/compiled/scripts/homeplus_core_frontend_tests.js']),
  'g0.3': () => runCommand('G0.3 cache/context contracts', 'node', ['scripts/compiled/scripts/planner_g0_3_cache_tests.js']),
  'planner-v1-m1': () => runCommand(
    'Planner V1 M1 navigation tests',
    'node',
    ['scripts/compiled/scripts/planner_v1_navigation_tests.js'],
  ),
  'planner-v1-m2': () => runCommand(
    'Planner V1 M2 shell state tests',
    'node',
    ['scripts/compiled/scripts/planner_v1_shell_state_tests.js'],
  ),
  'g0.4-contracts': () => runCommand('G0.4 feature/telemetry/outbox contracts', 'node', ['scripts/homeplus_g0_4_contract_tests.js']),
  'g0.4-db': () => runCommand('G0.4 database contracts', 'node', ['scripts/homeplus_g0_4_database_tests.js']),
  'integration-g0.4': () => runCommand('G0.4 runtime integration', 'node', ['tests/integration/run.js', '--suite=g0.4']),
  'integration-all': () => runCommand('Runtime integration', 'node', ['tests/integration/run.js']),
  db: () => runCommand('Database suite', 'node', ['tests/db/run.js']),
  secrets: () => runCommand('Secret/privacy file scan', 'node', ['tests/static/secret-scan.js']),
  coverage: () => runCommand('Core coverage baseline', 'npm', ['run', 'test:coverage']),
  'ci-syntax': () => runCommand('CI workflow syntax', 'node', ['tests/static/workflow-syntax.js']),
  whitespace: () => runCommand('Whitespace check', 'git', ['diff', '--check']),
};

const suites = {
  typecheck: ['frontend-typecheck', 'test-typecheck'],
  lint: ['backend-syntax', 'backend-eslint', 'frontend-lint'],
  backend: ['testing-core', 'core-backend'],
  frontend: ['compile-frontend-tests', 'core-frontend', 'g0.3'],
  contracts: ['core-backend', 'g0.4-contracts'],
  'core-backend': ['testing-core', 'core-backend'],
  'core-frontend': ['compile-frontend-tests', 'core-frontend'],
  core: ['testing-core', 'core-backend', 'compile-frontend-tests', 'core-frontend'],
  planner: ['compile-frontend-tests', 'g0.3', 'planner-v1-m2'],
  'planner-m1': ['compile-frontend-tests', 'planner-v1-m1'],
  'planner-m2': ['compile-frontend-tests', 'planner-v1-m2'],
  'g0.3': ['compile-frontend-tests', 'g0.3'],
  'g0.4': ['g0.4-contracts', 'g0.4-db', 'integration-g0.4'],
  'feature-flags': ['g0.4-contracts'],
  telemetry: ['g0.4-contracts'],
  'audit-outbox': ['g0.4-contracts', 'g0.4-db'],
  quality: [
    'frontend-typecheck', 'test-typecheck', 'backend-syntax', 'backend-eslint', 'frontend-lint',
    'testing-core', 'core-backend', 'compile-frontend-tests', 'core-frontend', 'g0.3',
    'g0.4-contracts', 'db', 'coverage', 'secrets', 'ci-syntax', 'whitespace',
  ],
  g0: [
    'frontend-typecheck', 'test-typecheck', 'backend-syntax', 'backend-eslint', 'frontend-lint',
    'testing-core', 'core-backend', 'compile-frontend-tests', 'core-frontend', 'g0.3',
    'g0.4-contracts', 'db', 'coverage', 'secrets', 'ci-syntax', 'whitespace', 'integration-all',
  ],
};

async function main() {
  process.chdir(repositoryRoot);
  const suiteName = process.argv[2];
  const suite = suites[suiteName];
  if (!suite) {
    console.error(`Unknown suite: ${suiteName || '[missing]'}`);
    console.error(`Available: ${Object.keys(suites).sort().join(', ')}`);
    process.exitCode = 2;
    return;
  }
  const startedAt = Date.now();
  for (const commandName of suite) commands[commandName]();
  console.log(`\nHOMEPLUS TEST SUITE: ${suiteName} PASSED (${suite.length} commands, ${Date.now() - startedAt} ms)`);
}

main().catch((error) => {
  console.error(`HOMEPLUS TEST SUITE: FAILED (${error.message})`);
  process.exitCode = error.exitCode || 1;
});
