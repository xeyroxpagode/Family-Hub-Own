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
  'compile-planner-reliability-tests': () => runCommand(
    'Compile Planner Reliability tests',
    'npm',
    ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.planner_reliability_test.json'],
  ),
  'compile-planner-reliability-frontend-tests': () => runCommand(
    'Compile Planner Reliability Frontend tests',
    'npm',
    ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.planner_reliability_frontend_test.json'],
  ),
  'compile-planner-reliability-integration-tests': () => runCommand(
    'Compile Planner Reliability Integration tests',
    'npm',
    ['exec', 'tsc', '--', '-p', 'scripts/tsconfig.planner_reliability_integration_test.json'],
  ),
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
  'planner-v1-m3': () => runCommand(
    'Planner V1 M3 sheet state tests',
    'node',
    ['scripts/compiled/scripts/planner_v1_sheet_state_tests.js'],
  ),
  'planner-v1-m4': () => runCommand(
    'Planner V1 M4 quick actions tests',
    'node',
    ['scripts/compiled/scripts/planner_v1_quick_actions_tests.js'],
  ),
  'planner-v1-m5': () => runCommand(
    'Planner V1 M5 goal quick create tests',
    'node',
    ['scripts/compiled/scripts/planner_v1_goal_quick_create_tests.js'],
  ),
  'planner-v1-m6': () => runCommand(
    'Planner V1 M6 tab preferences tests',
    'node',
    ['scripts/compiled/scripts/planner_v1_tab_preferences_tests.js'],
  ),
  'planner-v1-m7': () => runCommand(
    'Planner V1 M7 household transition search tests',
    'node',
    ['scripts/compiled/scripts/planner_v1_m7_tests.js'],
  ),
  'planner-v1-m8': () => runCommand(
    'Planner V1 M8 home summary backend tests',
    'node',
    ['scripts/planner_v1_m8_tests.js'],
  ),
  'planner-v1-m9': () => runCommand(
    'Planner V1 M9 home summary frontend tests',
    'node',
    ['scripts/planner_v1_m9_tests.js'],
  ),
  'planner-v1-m10': () => runCommand(
    'Planner V1 M10 deep links runtime tests',
    'node',
    ['scripts/compiled/scripts/planner_v1_m10_tests.js'],
  ),
  'planner-v1-foundation': () => {
    const env = {
      ...process.env,
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Planner V1 frontend foundation tests',
      'node',
      ['scripts/compiled/scripts/planner_v1_frontend_foundation_tests.js'],
      { env },
    );
  },
  'planner-v1-reliability': () => {
    const env = {
      ...process.env,
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Planner V1 M11.7A reliability tests',
      'node',
      ['scripts/compiled-reliability/scripts/planner_m11_7a_reliability_tests.js'],
      { env },
    );
  },
  'planner-v1-reliability-frontend': () => {
    const env = {
      ...process.env,
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Planner V1 M11.7B reliability frontend tests',
      'node',
      ['scripts/compiled-reliability-frontend/scripts/planner_m11_7b_reliability_frontend_tests.js'],
      { env },
    );
  },
  'planner-v1-reliability-integration': () => {
    const env = {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:54321',
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Planner V1 M11.7C reliability integration tests',
      'node',
      ['scripts/compiled-reliability-integration/scripts/planner_m11_7c_reliability_integration_tests.js'],
      { env },
    );
  },
  'planner-v1-frontend-core-integration': () => {
    const env = {
      ...process.env,
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Planner V1 frontend core integration tests',
      'node',
      ['scripts/compiled/scripts/planner_v1_frontend_core_integration_tests.js'],
      { env },
    );
  },
  'planner-v1-frontend-tasks': () => runCommand(
    'Planner V1 tasks frontend tests',
    'node',
    ['scripts/compiled/scripts/planner_v1_frontend_tasks_tests.js'],
  ),
  'planner-v1-frontend-events': () => {
    const env = {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:54321',
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Planner V1 events frontend tests',
      'node',
      ['scripts/compiled/scripts/planner_v1_frontend_events_tests.js'],
      { env },
    );
  },
  'planner-v1-frontend-plans': () => {
    const env = {
      ...process.env,
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:54321',
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Planner V1 plans frontend tests',
      'node',
      ['scripts/compiled/scripts/planner_v1_frontend_plans_tests.js'],
      { env },
    );
  },
  'planner-v1-presets-drafts': () => {
    const env = {
      ...process.env,
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Planner V1 presets/drafts frontend tests',
      'node',
      ['scripts/planner_v1_presets_drafts_frontend_tests.js'],
      { env },
    );
  },
  'planner-v1-presets-drafts-integration': () => {
    const env = {
      ...process.env,
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Planner V1 presets/drafts integration tests',
      'node',
      ['scripts/compiled/scripts/planner_v1_presets_drafts_integration_tests.js'],
      { env },
    );
  },
  'planner-v1-s2-runtime-owner': () => {
    const env = {
      ...process.env,
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Planner V1 Shared S2 Runtime Owner tests',
      'node',
      ['scripts/compiled/scripts/planner_v1_shared_s2_runtime_owner_tests.js'],
      { env },
    );
  },
  'planner-v1-s2-terminal-contract': () => {
    const env = {
      ...process.env,
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Planner V1 Shared S2 Terminal Contract tests',
      'node',
      ['scripts/compiled/scripts/planner_v1_shared_s2_terminal_contract_tests.js'],
      { env },
    );
  },
  'planner-v1-s2-runtime-composition': () => {
    const env = {
      ...process.env,
      NODE_PATH: path.join(repositoryRoot, 'tests', 'stubs'),
    };
    return runCommand(
      'Planner V1 Shared S2 Runtime Composition tests',
      'node',
      ['scripts/compiled/scripts/planner_v1_shared_s2_runtime_composition_tests.js'],
      { env },
    );
  },
  'runtime-smoke': () => runCommand(
    'Frontend runtime smoke',
    'node',
    ['scripts/runtime_smoke_test.js'],
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
  planner: ['compile-frontend-tests', 'g0.3', 'planner-v1-m1', 'planner-v1-m2', 'planner-v1-m3', 'planner-v1-m4', 'planner-v1-m5', 'planner-v1-m6', 'planner-v1-m7', 'planner-v1-m8', 'planner-v1-m9', 'planner-v1-m10', 'planner-v1-foundation', 'compile-planner-reliability-tests', 'planner-v1-reliability', 'compile-planner-reliability-frontend-tests', 'planner-v1-reliability-frontend', 'compile-planner-reliability-integration-tests', 'planner-v1-reliability-integration', 'planner-v1-frontend-core-integration', 'planner-v1-frontend-tasks', 'planner-v1-frontend-events', 'planner-v1-frontend-plans', 'planner-v1-presets-drafts', 'planner-v1-presets-drafts-integration', 'planner-v1-s2-runtime-owner', 'planner-v1-s2-terminal-contract', 'planner-v1-s2-runtime-composition'],
  home: ['planner-v1-m9'],
  'planner-m1': ['compile-frontend-tests', 'planner-v1-m1'],
  'planner-m2': ['compile-frontend-tests', 'planner-v1-m2'],
  'planner-m3': ['compile-frontend-tests', 'planner-v1-m3'],
  'planner-m4': ['compile-frontend-tests', 'planner-v1-m4'],
  'planner-m5': ['compile-frontend-tests', 'planner-v1-m5'],
  'planner-m6': ['compile-frontend-tests', 'planner-v1-m6'],
  'planner-m7': ['compile-frontend-tests', 'planner-v1-m7'],
  'planner-m8': ['planner-v1-m8'],
  'planner-m9': ['planner-v1-m9'],
  'planner-m10': ['compile-frontend-tests', 'planner-v1-m10'],
  'planner-foundation': ['compile-frontend-tests', 'planner-v1-foundation'],
  'planner-reliability': ['compile-planner-reliability-tests', 'planner-v1-reliability'],
  'planner-reliability-frontend': ['compile-planner-reliability-frontend-tests', 'planner-v1-reliability-frontend'],
  'planner-reliability-integration': ['compile-planner-reliability-integration-tests', 'planner-v1-reliability-integration'],
  'planner-frontend-core-integration': ['compile-frontend-tests', 'planner-v1-frontend-core-integration'],
  'planner-frontend-tasks': ['compile-frontend-tests', 'planner-v1-frontend-tasks'],
  'planner-frontend-events': ['compile-frontend-tests', 'planner-v1-frontend-events'],
  'planner-frontend-plans': ['compile-frontend-tests', 'planner-v1-frontend-plans'],
  'planner-presets-drafts': ['compile-frontend-tests', 'planner-v1-presets-drafts'],
  'planner-presets-drafts-integration': ['compile-frontend-tests', 'planner-v1-presets-drafts-integration'],
  'planner-shared-s2-runtime': ['compile-frontend-tests', 'planner-v1-s2-runtime-owner'],
  'planner-shared-s2-terminal': ['compile-frontend-tests', 'planner-v1-s2-terminal-contract'],
  'planner-shared-s2-composition': ['compile-frontend-tests', 'planner-v1-s2-runtime-composition'],
  'g0.3': ['compile-frontend-tests', 'g0.3'],
  'g0.4': ['g0.4-contracts', 'g0.4-db', 'integration-g0.4'],
  'feature-flags': ['g0.4-contracts'],
  telemetry: ['g0.4-contracts'],
  'audit-outbox': ['g0.4-contracts', 'g0.4-db'],
  quality: [
    'frontend-typecheck', 'test-typecheck', 'backend-syntax', 'backend-eslint', 'frontend-lint',
    'testing-core', 'core-backend', 'compile-frontend-tests', 'core-frontend', 'g0.3',
    'g0.4-contracts', 'runtime-smoke', 'db', 'coverage', 'secrets', 'ci-syntax', 'whitespace',
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
