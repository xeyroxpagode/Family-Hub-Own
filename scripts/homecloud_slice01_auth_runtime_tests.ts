import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  resolvePrivateTreeDecision,
  shouldPreserveAuthMeAfterLoadFailure,
} from '../front/mi-front-limpio/context/authProjectionLifecycle.ts';

let passed = 0;
function test(name: string, run: () => void): void {
  run();
  passed += 1;
  console.log(`  PASS: ${name}`);
}

console.log('\n=== HOMECLOUD SLICE 01 AUTH RUNTIME RECOVERY ===\n');

test('valid authMe plus loading preserves the private stack', () => {
  assert.equal(resolvePrivateTreeDecision({ authMeLoading: true, hasAuthMe: true, hasAuthMeError: false, experienceReady: true }), 'private_stack');
});

test('initial unresolved auth still renders the loading gate', () => {
  assert.equal(resolvePrivateTreeDecision({ authMeLoading: true, hasAuthMe: false, hasAuthMeError: false, experienceReady: true }), 'auth_loading');
});

test('token refresh revalidation preserves mounted child identity', () => {
  const mountedChild = { identity: Symbol('mounted-child') };
  const render = (decision: ReturnType<typeof resolvePrivateTreeDecision>, current: typeof mountedChild) =>
    decision === 'private_stack' ? current : { identity: Symbol('replacement-child') };
  const before = resolvePrivateTreeDecision({ authMeLoading: false, hasAuthMe: true, hasAuthMeError: false, experienceReady: true });
  const during = resolvePrivateTreeDecision({ authMeLoading: true, hasAuthMe: true, hasAuthMeError: false, experienceReady: true });
  assert.equal(before, 'private_stack');
  assert.equal(during, 'private_stack');
  assert.equal(render(during, render(before, mountedChild)), mountedChild);
});

test('transient authMe failure preserves the prior projection and tree', () => {
  assert.equal(shouldPreserveAuthMeAfterLoadFailure(true), true);
  assert.equal(resolvePrivateTreeDecision({ authMeLoading: false, hasAuthMe: true, hasAuthMeError: false, experienceReady: true }), 'private_stack');
});

test('actual sign-out removes the private tree', () => {
  assert.equal(shouldPreserveAuthMeAfterLoadFailure(false), false);
  assert.notEqual(resolvePrivateTreeDecision({ authMeLoading: false, hasAuthMe: false, hasAuthMeError: false, experienceReady: true }), 'private_stack');
});

test('gallery protection lives at the auth owner, not in MemoryIntake persistence', () => {
  const intake = fs.readFileSync(path.join(process.cwd(), 'front/mi-front-limpio/services/homecloud/MemoryIntake.tsx'), 'utf8');
  const navigator = fs.readFileSync(path.join(process.cwd(), 'front/mi-front-limpio/navigation/AppNavigator.tsx'), 'utf8');
  assert.match(navigator, /resolvePrivateTreeDecision/);
  assert.doesNotMatch(intake, /authMeLoading|TOKEN_REFRESHED|preserve.*draft/i);
});

console.log(`\nHOMECLOUD_SLICE01_AUTH_RUNTIME_RESULT pass=${passed} fail=0`);
